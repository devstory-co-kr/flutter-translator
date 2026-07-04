import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as vscode from "vscode";
import { ARB, ARBService } from "../app/component/arb/arb";
import { ARBValidationRepository } from "../app/component/arb/validation/arb_validation.repository";
import { ConfigService } from "../app/component/config/config";
import {
  getIapLocale,
  getIapTitle,
  IAP_PLAN_LENGTH_LIMITS,
  IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS,
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
  targetLocales: string[];
};

// A single translatable IAP field occurrence and the locales it must be
// (re)translated into — the IAP analogue of an untranslated ARB key. Unlike
// ARB, every target locale is always (re)translated, not only missing ones;
// Korean/English are the hand-maintained source/exclude locales and are not
// in targetLocales.
type IapUnit = {
  platform: MetadataPlatform;
  target: IapTranslateTarget;
  filePath: string;
  fileName: string;
  itemIndex: number;
  field: IapField;
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

  private server?: http.Server;
  private token?: string;
  private bridgeFilePath?: string;
  private sessions = new Map<string, Session>();
  private iapSessions = new Map<string, IapSession>();

  constructor({
    arbService,
    arbValidationRepository,
    languageService,
    configService,
    translationCacheRepository,
    iapService,
    metadataService,
  }: InitParams) {
    this.arbService = arbService;
    this.arbValidationRepository = arbValidationRepository;
    this.languageService = languageService;
    this.configService = configService;
    this.translationCacheRepository = translationCacheRepository;
    this.iapService = iapService;
    this.metadataService = metadataService;
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

    // Each window writes its own bridge file under its own workspace, so
    // multiple windows never collide and the MCP server discovers the right
    // one by walking up from its cwd.
    const dir = path.join(
      workspaceFolder.uri.fsPath,
      ".vscode",
      "flutter-translator",
    );
    fs.mkdirSync(dir, { recursive: true });
    this.bridgeFilePath = path.join(dir, "mcp-bridge.json");
    fs.writeFileSync(
      this.bridgeFilePath,
      JSON.stringify({ port, token: this.token }, null, 2),
      "utf-8",
    );
    Logger.i(`MCP bridge listening on 127.0.0.1:${port}`);
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

  // The English source language actually present in the files (e.g. "en-US"),
  // used as the translation source. undefined when no English localization
  // exists — there is then nothing to translate from.
  private findSourceLocale(
    platform: MetadataPlatform,
    presentLocales: Set<string>,
  ): { locale: string; languageCode: string } | undefined {
    const languages = this.metadataService.getSupportMetadataLanguages(
      platform,
    );
    for (const locale of presentLocales) {
      const match = languages.find((l) => l.locale === locale);
      if (match?.translateLanguage.languageCode === "en") {
        return { locale, languageCode: match.translateLanguage.languageCode };
      }
    }
    return undefined;
  }

  // The locales to translate INTO: the platform's configured metadata languages
  // (the locales the app actually ships store listings in — folders under
  // fastlane metadata), minus the source language (all its variants, e.g. other
  // en-* locales) and the hand-maintained exclude locales. This mirrors ARB
  // using the configured target language list rather than whatever locales
  // already happen to appear inside the IAP file.
  private getIapTargetLocales(
    platform: MetadataPlatform,
    sourceLanguageCode: string,
  ): string[] {
    const excludeSet = this.getIapExcludeLocaleSet();
    return this.metadataService
      .getMetadataLanguagesInPlatform(platform)
      .filter(
        (l) =>
          l.translateLanguage.languageCode !== sourceLanguageCode &&
          !excludeSet.has(l.locale),
      )
      .map((l) => l.locale);
  }

  private getPlanFieldValue(
    platform: MetadataPlatform,
    loc: IapLocalization,
    field: IapField,
  ): string | undefined {
    return field === IapField.title
      ? getIapTitle(platform, loc)
      : loc.description;
  }

  private setPlanFieldValue(
    platform: MetadataPlatform,
    loc: IapLocalization,
    field: IapField,
    value: string,
  ): void {
    if (field === IapField.title) {
      setIapTitle(platform, loc, value);
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
      return field === IapField.title ? limits.title : limits.description;
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
      const targetLocales = this.getIapTargetLocales(
        platform,
        sourceInfo.languageCode,
      );

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
      const targetLocales = this.getIapTargetLocales(
        platform,
        sourceInfo.languageCode,
      );

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

  // action: iap_list — count of untranslated (field × locale) pairs grouped by
  // platform + target, so the caller can see what IAP work remains.
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
    const units = this.enumerateIapUnits();
    const totalRemaining = units.length;
    if (totalRemaining === 0) {
      return { totalRemaining: 0, item: null };
    }

    const unit = units[0];
    const sessionId = crypto.randomUUID();
    this.iapSessions.set(sessionId, {
      platform: unit.platform,
      target: unit.target,
      filePath: unit.filePath,
      itemIndex: unit.itemIndex,
      field: unit.field,
      targetLocales: unit.targetLocales,
    });

    return {
      sessionId,
      totalRemaining,
      maxLength: this.getFieldLimit(unit.platform, unit.target, unit.field),
      item: {
        platform: unit.platform,
        target: unit.target,
        fileName: unit.fileName,
        field: unit.field,
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

    const { platform, target, filePath, itemIndex, field, targetLocales } =
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
        this.setPlanFieldValue(platform, targetLoc, field, value);
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

    const ok = failures.length === 0;
    if (ok) {
      this.iapSessions.delete(sessionId);
    }
    return { ok, written, failures };
  }
}
