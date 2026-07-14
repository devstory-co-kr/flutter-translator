import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as vscode from "vscode";
import { BRIDGE_DIR, bridgeFilePath } from "./discovery";
import { ARB, ARBService } from "../app/component/arb/arb";
import { ARBValidationRepository } from "../app/component/arb/validation/arb_validation.repository";
import { ChangelogService } from "../app/component/changelog/changelog.service";
import { ConfigService } from "../app/component/config/config";
import {
  getIapLocale,
  getIapTitle,
  IAP_PLAN_BENEFIT_LIMITS,
  IAP_PLAN_LENGTH_LIMITS,
  IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS,
  IapCheckIssueType,
  IapField,
  IapLocalization,
  IapSubscriptionGroupLocalization,
  IapTranslateTarget,
  setIapLocale,
  setIapTitle,
} from "../app/component/iap/iap";
import { IapService } from "../app/component/iap/iap.service";
import { LanguageService } from "../app/component/language/language.service";
import { MetadataPlatform } from "../app/component/metadata/metadata";
import { MetadataService } from "../app/component/metadata/metadata.service";
import { TranslationCacheKey } from "../app/component/translation/cache/translation_cache";
import { TranslationCacheRepository } from "../app/component/translation/cache/translation_cache.repository";
import { Logger } from "../app/util/logger";

// Per-key translation session. The extension holds the single ARB key and the
// list of target languages it is missing in, so the MCP side (and Claude) only
// ever deals with one key translated into many languages at a time.
type Session = {
  key: string;
  missingIn: string[];
};

// Per-field IAP translation session. Mirrors the ARB `Session`: one logical
// field of one plan/group (identified by file path + array index) translated
// into all its target locales.
type IapSession = {
  platform: MetadataPlatform;
  target: IapTranslateTarget;
  filePath: string;
  itemIndex: number;
  field: IapField;
  // Array index within the field when it is a `benefits` element; undefined for
  // scalar fields (title/description/name/custom_app_name).
  fieldIndex?: number;
  targetLocales: string[];
};

// The hand-maintained English source locale for IAP. Other en-* locales
// (en-GB, en-AU, …) are translation targets filled from this one.
const IAP_ENGLISH_SOURCE_LOCALE = "en-US";

// One changelog file to write: a (platform, locale) pair plus the translate
// language it belongs to and that platform's store length limit. Translations
// are keyed by languageCode, so one translated text fans out to every target
// sharing that language.
type ChangelogTarget = {
  platform: MetadataPlatform;
  locale: string;
  languageCode: string;
  maxLength: number;
};

// Changelog translation session: the whole build-number changelog translated
// into every target language in one round, unlike the per-key ARB and
// per-field IAP sessions.
type ChangelogSession = {
  buildNumber: string;
  targets: ChangelogTarget[];
};

// A single translatable IAP field occurrence and the locales it must be
// (re)translated into — the IAP analogue of an untranslated ARB key. Unlike
// ARB, every target locale is always (re)translated, not only missing ones;
// the en-US source and the exclude locales (e.g. Korean) are hand-maintained
// and are not in targetLocales.
type IapUnit = {
  platform: MetadataPlatform;
  target: IapTranslateTarget;
  filePath: string;
  fileName: string;
  itemIndex: number;
  field: IapField;
  // Array index within the field when it is a `benefits` element; undefined for
  // scalar fields.
  fieldIndex?: number;
  source: string;
  targetLocales: string[];
  reference: Record<string, string>;
};

interface InitParams {
  arbService: ARBService;
  arbValidationRepository: ARBValidationRepository;
  languageService: LanguageService;
  configService: ConfigService;
  translationCacheRepository: TranslationCacheRepository;
  iapService: IapService;
  metadataService: MetadataService;
  changelogService: ChangelogService;
}

// localhost HTTP bridge that lets the bundled MCP server reuse the extension's
// ARB services (config reading, validation, cache) which depend on the VS Code
// API and therefore cannot run inside the standalone MCP process.
export class McpBridge {
  private arbService: ARBService;
  private arbValidationRepository: ARBValidationRepository;
  private languageService: LanguageService;
  private configService: ConfigService;
  private translationCacheRepository: TranslationCacheRepository;
  private iapService: IapService;
  private metadataService: MetadataService;
  private changelogService: ChangelogService;

  private server?: http.Server;
  private token?: string;
  private bridgeFilePath?: string;
  private sessions = new Map<string, Session>();
  private iapSessions = new Map<string, IapSession>();
  private changelogSessions = new Map<string, ChangelogSession>();
  // Identities of IAP field units already translated in the current loop, so
  // iap_start_translation advances to the next field instead of always handing
  // back units[0]. Cleared once every unit is consumed (loop finished).
  private iapConsumed = new Set<string>();

  constructor({
    arbService,
    arbValidationRepository,
    languageService,
    configService,
    translationCacheRepository,
    iapService,
    metadataService,
    changelogService,
  }: InitParams) {
    this.arbService = arbService;
    this.arbValidationRepository = arbValidationRepository;
    this.languageService = languageService;
    this.configService = configService;
    this.translationCacheRepository = translationCacheRepository;
    this.iapService = iapService;
    this.metadataService = metadataService;
    this.changelogService = changelogService;
  }

  public async start(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder || this.server) {
      return;
    }

    this.token = crypto.randomBytes(16).toString("hex");
    this.server = http.createServer((req, res) => this.handle(req, res));

    await new Promise<void>((resolve) => {
      this.server!.listen(0, "127.0.0.1", () => resolve());
    });

    const address = this.server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    // Each window writes its own bridge file, named after its workspace path
    // hash, into the per-user tmp dir — never into the workspace itself. The
    // MCP server discovers it by hashing its cwd ancestors (see discovery.ts).
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
    this.bridgeFilePath = bridgeFilePath(workspaceFolder.uri.fsPath);
    fs.writeFileSync(
      this.bridgeFilePath,
      JSON.stringify({ port, token: this.token }, null, 2),
      "utf-8",
    );
    this.cleanupLegacyBridgeFiles(workspaceFolder.uri.fsPath);
    Logger.i(`MCP bridge listening on 127.0.0.1:${port}`);
  }

  // Older versions wrote the bridge file (plus a .gitignore for it) into
  // <workspace>/.vscode/flutter-translator/, littering projects on every
  // activation. Remove those leftovers, and the directory too when nothing
  // else (history.json, cache.json, …) lives there.
  private cleanupLegacyBridgeFiles(workspacePath: string): void {
    try {
      const legacyDir = path.join(
        workspacePath,
        ".vscode",
        "flutter-translator",
      );
      const legacyBridge = path.join(legacyDir, "mcp-bridge.json");
      if (fs.existsSync(legacyBridge)) {
        fs.rmSync(legacyBridge);
      }
      const legacyGitignore = path.join(legacyDir, ".gitignore");
      if (
        fs.existsSync(legacyGitignore) &&
        fs.readFileSync(legacyGitignore, "utf-8") === "mcp-bridge.json\n"
      ) {
        fs.rmSync(legacyGitignore);
      }
      if (fs.existsSync(legacyDir) && fs.readdirSync(legacyDir).length === 0) {
        fs.rmdirSync(legacyDir);
      }
    } catch (e: any) {
      Logger.e(e);
    }
  }

  public stop(): void {
    this.server?.close();
    this.server = undefined;
    if (this.bridgeFilePath && fs.existsSync(this.bridgeFilePath)) {
      fs.rmSync(this.bridgeFilePath);
    }
    this.bridgeFilePath = undefined;
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const request = JSON.parse(body || "{}");
        if (request.token !== this.token) {
          return this.send(res, 401, { error: "Invalid token" });
        }
        const result = await this.dispatch(request);
        this.send(res, 200, result);
      } catch (e: any) {
        Logger.e(e);
        this.send(res, 500, { error: e?.message ?? String(e) });
      }
    });
  }

  private send(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private async dispatch(request: any): Promise<unknown> {
    switch (request.action) {
      case "list":
        return this.list();
      case "start":
        return this.start_translation();
      case "finish":
        return this.finish_translation(
          request.sessionId,
          request.translations,
        );
      case "iap_list":
        return this.iap_list();
      case "iap_start":
        return this.iap_start_translation();
      case "iap_finish":
        return this.iap_finish_translation(
          request.sessionId,
          request.translations,
        );
      case "iap_check":
        return this.iap_check();
      case "changelog_start":
        return this.changelog_start(request.sourceLocale);
      case "changelog_finish":
        return this.changelog_finish(request.sessionId, request.translations);
      case "changelog_check":
        return this.changelog_check();
      default:
        return { error: `Unknown action: ${request.action}` };
    }
  }

  // ARB metadata keys start with "@" (e.g. "@@locale", "@title").
  private isTranslatableKey(key: string): boolean {
    return !key.startsWith("@");
  }

  private getUntranslatedKeys(
    source: Record<string, string>,
    target: Record<string, string>,
  ): string[] {
    const keys: string[] = [];
    for (const key of Object.keys(source)) {
      if (!this.isTranslatableKey(key)) {
        continue;
      }
      const sourceValue = source[key];
      if (typeof sourceValue !== "string" || sourceValue === "") {
        continue;
      }
      const targetValue = target[key];
      if (targetValue === undefined || targetValue === "") {
        keys.push(key);
      }
    }
    return keys;
  }

  private async readTargetData(
    targetArbPath: string,
  ): Promise<Record<string, string>> {
    if (!fs.existsSync(targetArbPath)) {
      return {};
    }
    return (await this.arbService.getARB(targetArbPath)).data;
  }

  // Reference languages (arbConfig.exclude) are hand-maintained by the user and
  // must never be auto-translated, so we skip them as translation targets.
  private getExcludeLanguageCodeSet(): Set<string> {
    return new Set(
      this.arbService.getExcludeLanguageList().map((l) => l.languageCode),
    );
  }

  // action: list — untranslated counts per target language.
  private async list(): Promise<unknown> {
    const sourceARB = await this.arbService.getSourceARB();
    const targetLanguages = await this.arbService.getTargetLanguageList();
    const excludeSet = this.getExcludeLanguageCodeSet();

    const targets: {
      languageCode: string;
      fileName: string;
      count: number;
    }[] = [];
    for (const language of targetLanguages) {
      if (
        language.languageCode === sourceARB.language.languageCode ||
        excludeSet.has(language.languageCode)
      ) {
        continue;
      }
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(
          language.languageCode,
        );
      const targetData = await this.readTargetData(targetArbPath);
      const count = this.getUntranslatedKeys(sourceARB.data, targetData).length;
      if (count > 0) {
        targets.push({
          languageCode: language.languageCode,
          fileName: path.basename(targetArbPath),
          count,
        });
      }
    }
    return { targets };
  }

  // action: start — one untranslated key together with every target language
  // it is still missing in, plus the same key's wording in the user's
  // hand-maintained reference languages (arbConfig.exclude) as context.
  private async start_translation(): Promise<unknown> {
    const sourceARB = await this.arbService.getSourceARB();
    const targetLanguages = await this.arbService.getTargetLanguageList();
    const excludeLanguages = this.arbService.getExcludeLanguageList();
    const excludeSet = this.getExcludeLanguageCodeSet();

    // Map every still-missing key to the target languages that lack it.
    const missingMap: Record<string, string[]> = {};
    for (const language of targetLanguages) {
      if (
        language.languageCode === sourceARB.language.languageCode ||
        excludeSet.has(language.languageCode)
      ) {
        continue;
      }
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(
          language.languageCode,
        );
      const targetData = await this.readTargetData(targetArbPath);
      for (const k of this.getUntranslatedKeys(sourceARB.data, targetData)) {
        if (!missingMap[k]) {
          missingMap[k] = [];
        }
        missingMap[k].push(language.languageCode);
      }
    }

    const totalRemaining = Object.keys(missingMap).length;
    if (totalRemaining === 0) {
      return { totalRemaining: 0, item: null };
    }

    // Translate one key per round, in source key order.
    const key = Object.keys(sourceARB.data).find((k) => missingMap[k])!;
    const missingIn = missingMap[key];

    // reference wording for this key from the hand-maintained languages
    const reference: Record<string, string> = {};
    for (const language of excludeLanguages) {
      if (language.languageCode === sourceARB.language.languageCode) {
        continue;
      }
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(
          language.languageCode,
        );
      const targetData = await this.readTargetData(targetArbPath);
      const val = targetData[key];
      if (typeof val === "string" && val !== "") {
        reference[language.name] = val;
      }
    }

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, { key, missingIn });

    return {
      sessionId,
      sourceLanguageName: sourceARB.language.name,
      totalRemaining,
      item: {
        key,
        source: sourceARB.data[key],
        missingIn,
        ...(Object.keys(reference).length > 0 ? { reference } : {}),
      },
    };
  }

  // action: finish — validate, write and cache one key's translation in each of
  // its missing languages, returning any failing { languageCode } for retry.
  private async finish_translation(
    sessionId: string,
    translations: Record<string, string>,
  ): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: `Unknown sessionId: ${sessionId}` };
    }
    if (!translations || typeof translations !== "object") {
      return { error: "translations must be an object" };
    }

    const { key } = session;
    const sourceARB = await this.arbService.getSourceARB();
    const sourceValidation =
      this.arbValidationRepository.getValidation(sourceARB);
    const exclude = this.configService.getTranslationExclude();
    const source = sourceARB.data[key];

    let written = 0;
    const failures: { languageCode: string; key: string; source: string }[] =
      [];

    for (const langCode of session.missingIn) {
      const value = translations[langCode];
      if (value === undefined || value === "") {
        failures.push({ languageCode: langCode, key, source });
        continue;
      }

      const targetLanguage =
        this.languageService.getLanguageByLanguageCode(langCode);
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(langCode);

      // ensure the target file exists with @@locale, then merge this key in
      this.arbService.createIfNotExist(targetArbPath, targetLanguage);
      const existingData = await this.readTargetData(targetArbPath);
      const candidateData: Record<string, string> = {
        ...existingData,
        [key]: value,
      };
      const candidateARB: ARB = {
        filePath: targetArbPath,
        language: targetLanguage,
        data: candidateData,
        keys: Object.keys(candidateData),
        values: Object.values(candidateData),
      };

      // reuse the extension's validation, scoped to just this key
      const targetValidation =
        this.arbValidationRepository.getValidation(candidateARB);
      const sessionSourceValidation: Record<string, any> = {};
      const sessionTargetValidation: Record<string, any> = {};
      if (sourceValidation[key]) {
        sessionSourceValidation[key] = sourceValidation[key];
      }
      if (targetValidation[key]) {
        sessionTargetValidation[key] = targetValidation[key];
      }

      let invalid = false;
      const generator = this.arbValidationRepository.generateValidationResult(
        exclude,
        sourceARB,
        sessionSourceValidation,
        candidateARB,
        sessionTargetValidation,
      );
      while (true) {
        const { value: result } = await generator.next();
        if (!result) {
          break;
        }
        if (result.key === key) {
          invalid = true;
        }
      }

      if (invalid) {
        failures.push({ languageCode: langCode, key, source });
        continue;
      }

      // Order the target file by source key order so the new key lands in the
      // same position as in the source ARB instead of being appended.
      const finalData: Record<string, string> = {};
      for (const k of Object.keys(sourceARB.data)) {
        if (k === "@@locale") {
          finalData[k] = targetLanguage.languageCode;
          continue;
        }
        if (k === key) {
          finalData[k] = value;
        } else if (existingData[k] !== undefined) {
          finalData[k] = existingData[k];
        }
      }
      // Preserve any keys the target had that aren't in the source.
      for (const k of Object.keys(existingData)) {
        if (finalData[k] === undefined) {
          finalData[k] = existingData[k];
        }
      }
      this.arbService.upsert(targetArbPath, finalData);

      // cache in the same format as the Google flow
      this.translationCacheRepository.upsertAll([
        {
          cacheKey: new TranslationCacheKey({
            sourceArbValue: source,
            sourceLanguage: sourceARB.language,
            targetLanguage,
          }),
          value,
        },
      ]);
      written++;
    }

    const ok = failures.length === 0;
    if (ok) {
      this.sessions.delete(sessionId);
    }
    return { ok, written, failures };
  }

  // ===========================================================================
  // IAP (in-app purchase store listings) — same list/start/finish shape as ARB,
  // but the translation unit is one logical field (title/description of a plan,
  // or name/custom_app_name of a subscription group) instead of an ARB key.
  // The source language is English; the metadata exclude locales (the same role
  // arbConfig.exclude plays for ARB, e.g. Korean) are hand-maintained: they are
  // never translation targets and are surfaced as `reference` context instead.
  // ===========================================================================

  private getIapExcludeLocaleSet(): Set<string> {
    return new Set(this.configService.getMetadataExcludeLocaleList());
  }

  // Human-readable name for a locale, for the `reference` map. Falls back to
  // the raw locale when the platform has no matching support language.
  private getLocaleName(platform: MetadataPlatform, locale: string): string {
    const match = this.metadataService
      .getSupportMetadataLanguages(platform)
      .find((l) => l.locale === locale);
    return match?.name ?? locale;
  }

  // The English source locale present in the files, used as the translation
  // source. en-US is the hand-maintained source, so it is preferred; other en-*
  // locales are translation targets and must not be picked as the source (that
  // would overwrite them). Falls back to the first English locale when en-US is
  // absent. undefined when no English localization exists — nothing to
  // translate from.
  private findSourceLocale(
    platform: MetadataPlatform,
    presentLocales: Set<string>,
  ): { locale: string } | undefined {
    const languages = this.metadataService.getSupportMetadataLanguages(
      platform,
    );
    const englishLocales = [...presentLocales].filter(
      (locale) =>
        languages.find((l) => l.locale === locale)?.translateLanguage
          .languageCode === "en",
    );
    if (englishLocales.length === 0) {
      return undefined;
    }
    const locale =
      englishLocales.find((l) => l === IAP_ENGLISH_SOURCE_LOCALE) ??
      englishLocales[0];
    return { locale };
  }

  // The locales to translate INTO: the platform's configured metadata languages
  // (the locales the app actually ships store listings in — folders under
  // fastlane metadata), minus the source locale (en-US only, not other en-*
  // variants like en-GB/en-AU which are themselves translated) and the
  // hand-maintained exclude locales. This mirrors ARB using the configured
  // target language list rather than whatever locales already happen to appear
  // inside the IAP file.
  private getIapTargetLocales(
    platform: MetadataPlatform,
    sourceLocale: string,
  ): string[] {
    const excludeSet = this.getIapExcludeLocaleSet();
    return this.metadataService
      .getMetadataLanguagesInPlatform(platform)
      .filter((l) => l.locale !== sourceLocale && !excludeSet.has(l.locale))
      .map((l) => l.locale);
  }

  private getPlanFieldValue(
    platform: MetadataPlatform,
    loc: IapLocalization,
    field: IapField,
    fieldIndex?: number,
  ): string | undefined {
    if (field === IapField.title) {
      return getIapTitle(platform, loc);
    }
    if (field === IapField.benefit) {
      return loc.benefits?.[fieldIndex!];
    }
    return loc.description;
  }

  private setPlanFieldValue(
    platform: MetadataPlatform,
    loc: IapLocalization,
    field: IapField,
    value: string,
    fieldIndex?: number,
  ): void {
    if (field === IapField.title) {
      setIapTitle(platform, loc, value);
    } else if (field === IapField.benefit) {
      if (!loc.benefits) {
        loc.benefits = [];
      }
      loc.benefits[fieldIndex!] = value;
    } else {
      loc.description = value;
    }
  }

  private getGroupFieldValue(
    loc: IapSubscriptionGroupLocalization,
    field: IapField,
  ): string | undefined {
    return field === IapField.name ? loc.name : loc.custom_app_name ?? undefined;
  }

  private setGroupFieldValue(
    loc: IapSubscriptionGroupLocalization,
    field: IapField,
    value: string,
  ): void {
    if (field === IapField.name) {
      loc.name = value;
    } else {
      loc.custom_app_name = value;
    }
  }

  private getFieldLimit(
    platform: MetadataPlatform,
    target: IapTranslateTarget,
    field: IapField,
  ): number {
    if (target === IapTranslateTarget.plans) {
      const limits = IAP_PLAN_LENGTH_LIMITS[platform];
      if (field === IapField.title) {
        return limits.title;
      }
      if (field === IapField.benefit) {
        return IAP_PLAN_BENEFIT_LIMITS.length;
      }
      return limits.description;
    }
    return field === IapField.name
      ? IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.name
      : IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.custom_app_name;
  }

  // Untranslated field units for every plan file of a platform.
  private enumeratePlanUnits(platform: MetadataPlatform): IapUnit[] {
    const excludeSet = this.getIapExcludeLocaleSet();
    const units: IapUnit[] = [];
    for (const filePath of this.iapService.getIapFiles(platform)) {
      let plans;
      try {
        plans = this.iapService.readPlans(filePath);
      } catch {
        continue;
      }
      const fileName = path.basename(filePath);
      // The English source must actually exist in the file to translate from.
      const present = new Set<string>();
      for (const plan of plans) {
        for (const loc of plan.localizations ?? []) {
          const code = getIapLocale(platform, loc);
          if (code) {
            present.add(code);
          }
        }
      }
      const sourceInfo = this.findSourceLocale(platform, present);
      if (!sourceInfo) {
        continue;
      }
      const sourceLocale = sourceInfo.locale;
      const targetLocales = this.getIapTargetLocales(platform, sourceLocale);

      plans.forEach((plan, itemIndex) => {
        const locs = plan.localizations ?? [];
        const sourceLoc = locs.find(
          (l) => getIapLocale(platform, l) === sourceLocale,
        );
        if (!sourceLoc) {
          return;
        }
        for (const field of [IapField.title, IapField.description]) {
          const source = this.getPlanFieldValue(platform, sourceLoc, field);
          if (!source) {
            continue;
          }
          // Re-translate all target locales, not only the missing ones.
          if (targetLocales.length === 0) {
            continue;
          }
          const reference: Record<string, string> = {};
          for (const loc of locs) {
            const code = getIapLocale(platform, loc);
            if (!code || !excludeSet.has(code)) {
              continue;
            }
            const value = this.getPlanFieldValue(platform, loc, field);
            if (value) {
              reference[this.getLocaleName(platform, code)] = value;
            }
          }
          units.push({
            platform,
            target: IapTranslateTarget.plans,
            filePath,
            fileName,
            itemIndex,
            field,
            source,
            targetLocales,
            reference,
          });
        }

        // benefits: Android-only array, one unit per element (each carrying its
        // array index) so each is translated and length-validated on its own.
        if (platform === MetadataPlatform.android && targetLocales.length > 0) {
          const sourceBenefits = sourceLoc.benefits ?? [];
          sourceBenefits.forEach((source, fieldIndex) => {
            if (!source) {
              return;
            }
            const reference: Record<string, string> = {};
            for (const loc of locs) {
              const code = getIapLocale(platform, loc);
              if (!code || !excludeSet.has(code)) {
                continue;
              }
              const value = loc.benefits?.[fieldIndex];
              if (value) {
                reference[this.getLocaleName(platform, code)] = value;
              }
            }
            units.push({
              platform,
              target: IapTranslateTarget.plans,
              filePath,
              fileName,
              itemIndex,
              field: IapField.benefit,
              fieldIndex,
              source,
              targetLocales,
              reference,
            });
          });
        }
      });
    }
    return units;
  }

  // Untranslated field units for every iOS subscription_groups.json file
  // (one per flavor when flavor subfolders are used).
  private enumerateSubscriptionGroupUnits(): IapUnit[] {
    const platform = MetadataPlatform.ios;
    const excludeSet = this.getIapExcludeLocaleSet();
    const units: IapUnit[] = [];
    for (const filePath of this.iapService.getSubscriptionGroupsFiles()) {
      let groups;
      try {
        groups = this.iapService.readSubscriptionGroupsFile(filePath);
      } catch {
        continue;
      }
      const fileName = path.basename(filePath);
      const present = new Set<string>();
      for (const group of groups) {
        for (const loc of group.localizations ?? []) {
          if (loc.locale) {
            present.add(loc.locale);
          }
        }
      }
      const sourceInfo = this.findSourceLocale(platform, present);
      if (!sourceInfo) {
        continue;
      }
      const sourceLocale = sourceInfo.locale;
      const targetLocales = this.getIapTargetLocales(platform, sourceLocale);

      groups.forEach((group, itemIndex) => {
        const locs = group.localizations ?? [];
        const sourceLoc = locs.find((l) => l.locale === sourceLocale);
        if (!sourceLoc) {
          return;
        }
        for (const field of [IapField.name, IapField.customAppName]) {
          const source = this.getGroupFieldValue(sourceLoc, field);
          if (!source) {
            continue;
          }
          // Re-translate all target locales, not only the missing ones.
          if (targetLocales.length === 0) {
            continue;
          }
          const reference: Record<string, string> = {};
          for (const loc of locs) {
            if (!loc.locale || !excludeSet.has(loc.locale)) {
              continue;
            }
            const value = this.getGroupFieldValue(loc, field);
            if (value) {
              reference[this.getLocaleName(platform, loc.locale)] = value;
            }
          }
          units.push({
            platform,
            target: IapTranslateTarget.subscriptionGroups,
            filePath,
            fileName,
            itemIndex,
            field,
            source,
            targetLocales,
            reference,
          });
        }
      });
    }
    return units;
  }

  private enumerateIapUnits(): IapUnit[] {
    return [
      ...this.enumeratePlanUnits(MetadataPlatform.android),
      ...this.enumeratePlanUnits(MetadataPlatform.ios),
      ...this.enumerateSubscriptionGroupUnits(),
    ];
  }

  // action: iap_list — count of (field × locale) pairs grouped by platform +
  // target, so the caller can see the IAP work. This is the full re-translate
  // workload (every target locale is retranslated each run), not the count of
  // currently-missing translations, so it does not reflect translation state.
  private async iap_list(): Promise<unknown> {
    const grouped = new Map<
      string,
      { platform: MetadataPlatform; target: IapTranslateTarget; count: number }
    >();
    for (const unit of this.enumerateIapUnits()) {
      const key = `${unit.platform}:${unit.target}`;
      const entry =
        grouped.get(key) ??
        { platform: unit.platform, target: unit.target, count: 0 };
      entry.count += unit.targetLocales.length;
      grouped.set(key, entry);
    }
    return { targets: [...grouped.values()] };
  }

  // action: iap_start — one IAP field together with every target locale it must
  // be translated into, plus its wording in the hand-maintained exclude locales
  // (e.g. Korean) as reference context.
  private async iap_start_translation(): Promise<unknown> {
    const unitKey = (u: IapUnit) =>
      `${u.platform}:${u.target}:${u.filePath}:${u.itemIndex}:${u.field}:${u.fieldIndex ?? ""}`;
    const units = this.enumerateIapUnits();
    const remaining = units.filter((u) => !this.iapConsumed.has(unitKey(u)));
    const totalRemaining = remaining.length;
    if (totalRemaining === 0) {
      // Whole loop done; reset so a subsequent run starts fresh.
      this.iapConsumed.clear();
      return { totalRemaining: 0, item: null };
    }

    const unit = remaining[0];
    const sessionId = crypto.randomUUID();
    this.iapSessions.set(sessionId, {
      platform: unit.platform,
      target: unit.target,
      filePath: unit.filePath,
      itemIndex: unit.itemIndex,
      field: unit.field,
      fieldIndex: unit.fieldIndex,
      targetLocales: unit.targetLocales,
    });

    return {
      sessionId,
      totalRemaining,
      item: {
        platform: unit.platform,
        target: unit.target,
        fileName: unit.fileName,
        field: unit.field,
        maxLength: this.getFieldLimit(unit.platform, unit.target, unit.field),
        source: unit.source,
        targetLocales: unit.targetLocales,
        ...(Object.keys(unit.reference).length > 0
          ? { reference: unit.reference }
          : {}),
      },
    };
  }

  // action: iap_finish — validate length, then write one field's translation in
  // each target locale, returning any failing { locale } for re-translation.
  private async iap_finish_translation(
    sessionId: string,
    translations: Record<string, string>,
  ): Promise<unknown> {
    const session = this.iapSessions.get(sessionId);
    if (!session) {
      return { error: `Unknown sessionId: ${sessionId}` };
    }
    if (!translations || typeof translations !== "object") {
      return { error: "translations must be an object" };
    }

    const { platform, target, filePath, itemIndex, field, fieldIndex, targetLocales } =
      session;
    const limit = this.getFieldLimit(platform, target, field);
    const failures: {
      locale: string;
      field: IapField;
      reason: string;
    }[] = [];

    const isPlans = target === IapTranslateTarget.plans;
    let plans: ReturnType<IapService["readPlans"]> | undefined;
    let groups: ReturnType<IapService["readSubscriptionGroupsFile"]> | undefined;
    try {
      if (isPlans) {
        plans = this.iapService.readPlans(filePath);
      } else {
        groups = this.iapService.readSubscriptionGroupsFile(filePath);
      }
    } catch (e: any) {
      return { error: `Failed to read ${filePath}: ${e?.message ?? e}` };
    }

    const item = isPlans ? plans![itemIndex] : groups![itemIndex];
    if (!item) {
      return { error: `Item index ${itemIndex} no longer exists in ${filePath}` };
    }
    if (!item.localizations) {
      item.localizations = [];
    }
    const locs = item.localizations;

    let written = 0;
    for (const locale of targetLocales) {
      const value = translations[locale];
      if (value === undefined || value === "") {
        failures.push({ locale, field, reason: "missing translation" });
        continue;
      }
      if (value.length > limit) {
        failures.push({
          locale,
          field,
          reason: `exceeds ${limit} chars (${value.length})`,
        });
        continue;
      }

      if (isPlans) {
        const planLocs = locs as IapLocalization[];
        let targetLoc = planLocs.find(
          (l) => getIapLocale(platform, l) === locale,
        );
        if (!targetLoc) {
          targetLoc = {};
          setIapLocale(platform, targetLoc, locale);
          planLocs.push(targetLoc);
        }
        this.setPlanFieldValue(platform, targetLoc, field, value, fieldIndex);
      } else {
        const groupLocs = locs as IapSubscriptionGroupLocalization[];
        let targetLoc = groupLocs.find((l) => l.locale === locale);
        if (!targetLoc) {
          targetLoc = { locale };
          groupLocs.push(targetLoc);
        }
        this.setGroupFieldValue(targetLoc, field, value);
      }
      written++;
    }

    if (written > 0) {
      if (isPlans) {
        this.iapService.writePlans(filePath, plans!);
      } else {
        this.iapService.writeSubscriptionGroupsFile(filePath, groups!);
      }
    }

    // Keep only the still-failing locales as the session's remaining work, so a
    // follow-up call can resubmit just those (the ones already written must not
    // be re-flagged as "missing translation" on the next round).
    const ok = failures.length === 0;
    if (ok) {
      // Mark this field done so iap_start_translation advances to the next one.
      this.iapConsumed.add(
        `${platform}:${target}:${filePath}:${itemIndex}:${field}:${fieldIndex ?? ""}`,
      );
      this.iapSessions.delete(sessionId);
    } else {
      session.targetLocales = failures.map((f) => f.locale);
    }
    return { ok, written, failures };
  }

  // action: iap_check — re-run the extension's full IAP length/consistency
  // check over the written files so Claude can verify its own translations.
  // Returns the UI-independent fields of each issue; empty `issues` means every
  // IAP string is within limits and consistent.
  // Expected target locales whose IAP field is missing or empty while the
  // en-US source has a value — the "untranslated" state. checkIapFiles only
  // validates length/consistency and never flags a wholly missing locale, so
  // this fills that gap using the same source/target logic as translation.
  private collectUntranslatedIapIssues(): Array<{
    type: IapCheckIssueType;
    platform: string;
    file: string;
    locale: string;
    reason: string;
  }> {
    const issues: Array<{
      type: IapCheckIssueType;
      platform: string;
      file: string;
      locale: string;
      reason: string;
    }> = [];

    const push = (
      platform: MetadataPlatform,
      filePath: string,
      locale: string,
      reason: string,
    ) => {
      issues.push({
        type: IapCheckIssueType.untranslated,
        platform: platform === MetadataPlatform.android ? "Android" : "iOS",
        file: path.relative(
          this.iapService.getIapDirectory(platform),
          filePath,
        ),
        locale,
        reason,
      });
    };

    // Plans (both platforms).
    for (const platform of [MetadataPlatform.android, MetadataPlatform.ios]) {
      for (const filePath of this.iapService.getIapFiles(platform)) {
        let plans;
        try {
          plans = this.iapService.readPlans(filePath);
        } catch {
          continue;
        }
        const present = new Set<string>();
        for (const plan of plans) {
          for (const loc of plan.localizations ?? []) {
            const code = getIapLocale(platform, loc);
            if (code) {
              present.add(code);
            }
          }
        }
        const sourceInfo = this.findSourceLocale(platform, present);
        if (!sourceInfo) {
          continue;
        }
        const targetLocales = this.getIapTargetLocales(
          platform,
          sourceInfo.locale,
        );
        if (targetLocales.length === 0) {
          continue;
        }

        for (const plan of plans) {
          const locs = plan.localizations ?? [];
          const sourceLoc = locs.find(
            (l) => getIapLocale(platform, l) === sourceInfo.locale,
          );
          if (!sourceLoc) {
            continue;
          }
          const byLocale = new Map<string, IapLocalization>();
          for (const loc of locs) {
            const code = getIapLocale(platform, loc);
            if (code) {
              byLocale.set(code, loc);
            }
          }

          for (const field of [IapField.title, IapField.description]) {
            if (!this.getPlanFieldValue(platform, sourceLoc, field)) {
              continue;
            }
            for (const locale of targetLocales) {
              const target = byLocale.get(locale);
              const value = target
                ? this.getPlanFieldValue(platform, target, field)
                : undefined;
              if (!value) {
                push(platform, filePath, locale, `${field} not translated`);
              }
            }
          }

          // benefits: Android-only array, checked element-wise.
          if (platform === MetadataPlatform.android) {
            (sourceLoc.benefits ?? []).forEach((source, idx) => {
              if (!source) {
                return;
              }
              for (const locale of targetLocales) {
                const value = byLocale.get(locale)?.benefits?.[idx];
                if (!value) {
                  push(
                    platform,
                    filePath,
                    locale,
                    `benefit[${idx}] not translated`,
                  );
                }
              }
            });
          }
        }
      }
    }

    // Subscription groups (iOS).
    for (const filePath of this.iapService.getSubscriptionGroupsFiles()) {
      let groups;
      try {
        groups = this.iapService.readSubscriptionGroupsFile(filePath);
      } catch {
        continue;
      }
      const present = new Set<string>();
      for (const group of groups) {
        for (const loc of group.localizations ?? []) {
          if (loc.locale) {
            present.add(loc.locale);
          }
        }
      }
      const sourceInfo = this.findSourceLocale(MetadataPlatform.ios, present);
      if (!sourceInfo) {
        continue;
      }
      const targetLocales = this.getIapTargetLocales(
        MetadataPlatform.ios,
        sourceInfo.locale,
      );
      if (targetLocales.length === 0) {
        continue;
      }

      for (const group of groups) {
        const locs = group.localizations ?? [];
        const sourceLoc = locs.find((l) => l.locale === sourceInfo.locale);
        if (!sourceLoc) {
          continue;
        }
        const byLocale = new Map<string, IapSubscriptionGroupLocalization>();
        for (const loc of locs) {
          if (loc.locale) {
            byLocale.set(loc.locale, loc);
          }
        }
        for (const field of [IapField.name, IapField.customAppName]) {
          if (!this.getGroupFieldValue(sourceLoc, field)) {
            continue;
          }
          for (const locale of targetLocales) {
            const target = byLocale.get(locale);
            const value = target
              ? this.getGroupFieldValue(target, field)
              : undefined;
            if (!value) {
              push(
                MetadataPlatform.ios,
                filePath,
                locale,
                `${field} not translated`,
              );
            }
          }
        }
      }
    }

    return issues;
  }

  private async iap_check(): Promise<unknown> {
    const lengthIssues = this.iapService.checkIapFiles().map((issue) => ({
      type: issue.type,
      platform: issue.platformTag,
      file: issue.fileLabel,
      locale: issue.locale,
      reason: issue.reason,
    }));
    // Surface missing translations first — they are the actionable "not yet
    // translated" items, ahead of length/consistency warnings.
    const issues = [...this.collectUntranslatedIapIssues(), ...lengthIssues];
    return { ok: issues.length === 0, issues };
  }

  // ===========================================================================
  // Changelog (store release notes) — one session translates the current build
  // number's changelog into every target language. The source is picked by the
  // user in conversation: calling changelog_start without a sourceLocale
  // returns the candidate source locales, and the caller asks the user which
  // one to translate from before calling again with it.
  // ===========================================================================

  // Android is the source platform, mirroring ChangelogTranslateCmd: the iOS
  // release_notes.txt has no build number, so the Android changelog of the
  // current build is the authoritative source text.
  private getChangelogSourceCandidates(
    buildNumber: string,
  ): { locale: string; name: string }[] {
    const candidates: { locale: string; name: string }[] = [];
    for (const language of this.metadataService.getMetadataLanguagesInPlatform(
      MetadataPlatform.android,
    )) {
      const changelog = this.changelogService.getChangelog({
        platform: MetadataPlatform.android,
        language,
        buildNumber,
      });
      if (changelog.file.text.length > 0) {
        candidates.push({ locale: language.locale, name: language.name });
      }
    }
    return candidates;
  }

  // action: changelog_start — without sourceLocale: the candidate source
  // locales (for the user to choose from in conversation). With sourceLocale:
  // the source text plus every target language to translate it into; targets
  // in the SAME language as the source are copied directly here (the command
  // flow's "paste"), so Claude only translates actual foreign languages.
  private async changelog_start(sourceLocale?: string): Promise<unknown> {
    const buildNumber = this.changelogService.getBuildBumber();
    const candidates = this.getChangelogSourceCandidates(buildNumber);

    if (!sourceLocale) {
      return { buildNumber, candidates };
    }
    if (!candidates.some((c) => c.locale === sourceLocale)) {
      return {
        error:
          `No non-empty android changelog for locale "${sourceLocale}" and ` +
          `build number ${buildNumber}. Candidates: ` +
          (candidates.map((c) => c.locale).join(", ") || "(none)"),
      };
    }

    const sourcePlatform = MetadataPlatform.android;
    const sourceLanguage = this.metadataService
      .getMetadataLanguagesInPlatform(sourcePlatform)
      .find((l) => l.locale === sourceLocale)!;
    const sourceChangelog = this.changelogService.getChangelog({
      platform: sourcePlatform,
      language: sourceLanguage,
      buildNumber,
    });
    const sourceLanguageCode = sourceLanguage.translateLanguage.languageCode;
    const excludeSet = new Set(
      this.configService.getChangelogExcludeLocaleList(),
    );

    const targets: ChangelogTarget[] = [];
    // languageCode -> group; one translation per language, fanned out to all
    // of that language's platform locales, bounded by the strictest limit.
    const grouped = new Map<
      string,
      { languageCode: string; name: string; maxLength: number; locales: string[] }
    >();
    let pasted = 0;
    for (const platform of Object.values(MetadataPlatform)) {
      for (const language of this.metadataService.getMetadataLanguagesInPlatform(
        platform,
      )) {
        if (excludeSet.has(language.locale)) {
          continue;
        }
        if (platform === sourcePlatform && language.locale === sourceLocale) {
          continue;
        }
        const changelog = this.changelogService.getChangelog({
          platform,
          language,
          buildNumber,
        });
        const languageCode = language.translateLanguage.languageCode;
        if (languageCode === sourceLanguageCode) {
          // Same language on another platform/locale: copy, don't translate.
          changelog.file.text = sourceChangelog.file.text;
          this.changelogService.updateChangelog(changelog);
          pasted++;
          continue;
        }
        targets.push({
          platform,
          locale: language.locale,
          languageCode,
          maxLength: changelog.file.maxLength,
        });
        const entry = grouped.get(languageCode) ?? {
          languageCode,
          name: language.translateLanguage.name,
          maxLength: changelog.file.maxLength,
          locales: [],
        };
        entry.maxLength = Math.min(entry.maxLength, changelog.file.maxLength);
        entry.locales.push(`${platform}/${language.locale}`);
        grouped.set(languageCode, entry);
      }
    }

    if (targets.length === 0) {
      return { buildNumber, pasted, item: null };
    }

    // Hand-maintained wording (changelogExclude locales) as reference context.
    const reference: Record<string, string> = {};
    for (const platform of Object.values(MetadataPlatform)) {
      for (const language of this.metadataService.getMetadataLanguagesInPlatform(
        platform,
      )) {
        if (!excludeSet.has(language.locale) || reference[language.name]) {
          continue;
        }
        const changelog = this.changelogService.getChangelog({
          platform,
          language,
          buildNumber,
        });
        if (changelog.file.text.length > 0) {
          reference[language.name] = changelog.file.text;
        }
      }
    }

    const sessionId = crypto.randomUUID();
    this.changelogSessions.set(sessionId, { buildNumber, targets });

    return {
      sessionId,
      buildNumber,
      sourceLanguageName: sourceLanguage.name,
      pasted,
      item: {
        source: sourceChangelog.file.text,
        targetLanguages: [...grouped.values()],
        ...(Object.keys(reference).length > 0 ? { reference } : {}),
      },
    };
  }

  // action: changelog_finish — validate each language's text against the store
  // length limit, write it to every (platform, locale) file of that language,
  // and return the failing targets for re-translation.
  private async changelog_finish(
    sessionId: string,
    translations: Record<string, string>,
  ): Promise<unknown> {
    const session = this.changelogSessions.get(sessionId);
    if (!session) {
      return { error: `Unknown sessionId: ${sessionId}` };
    }
    if (!translations || typeof translations !== "object") {
      return { error: "translations must be an object" };
    }

    let written = 0;
    const failures: {
      platform: MetadataPlatform;
      locale: string;
      languageCode: string;
      maxLength: number;
      reason: string;
    }[] = [];
    const remaining: ChangelogTarget[] = [];

    for (const target of session.targets) {
      const value = translations[target.languageCode]?.trim();
      if (!value) {
        failures.push({ ...target, reason: "missing translation" });
        remaining.push(target);
        continue;
      }
      if (value.length > target.maxLength) {
        failures.push({
          ...target,
          reason: `exceeds ${target.maxLength} chars (${value.length})`,
        });
        remaining.push(target);
        continue;
      }
      const language = this.metadataService
        .getMetadataLanguagesInPlatform(target.platform)
        .find((l) => l.locale === target.locale);
      if (!language) {
        failures.push({ ...target, reason: "locale no longer configured" });
        continue;
      }
      const changelog = this.changelogService.createChangelog({
        platform: target.platform,
        language,
        buildNumber: session.buildNumber,
      });
      changelog.file.text = value;
      this.changelogService.updateChangelog(changelog);
      written++;
    }

    // Keep only the still-failing targets so a follow-up call resubmits just
    // those languages.
    const ok = failures.length === 0;
    if (ok) {
      this.changelogSessions.delete(sessionId);
    } else {
      session.targets = remaining;
    }
    return { ok, written, failures };
  }

  // action: changelog_check — the extension's changelog check over every
  // platform locale of the current build number (including the source and
  // hand-maintained locales, which the user fixes by hand).
  private async changelog_check(): Promise<unknown> {
    const issues = this.changelogService.getInvalidList().map((validation) => ({
      type: validation.validationType,
      platform: validation.changelog.platform,
      locale: validation.changelog.language.locale,
      filePath: validation.changelog.filePath,
    }));
    return { ok: issues.length === 0, issues };
  }
}
