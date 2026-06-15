import * as crypto from "crypto";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import * as vscode from "vscode";
import { ARB, ARBService } from "../app/component/arb/arb";
import { ARBValidationRepository } from "../app/component/arb/validation/arb_validation.repository";
import { ConfigService } from "../app/component/config/config";
import { LanguageService } from "../app/component/language/language.service";
import { TranslationCacheKey } from "../app/component/translation/cache/translation_cache";
import { TranslationCacheRepository } from "../app/component/translation/cache/translation_cache.repository";
import { Logger } from "../app/util/logger";

// Per-target translation session. The extension holds the ARB key mapping so
// the MCP side (and Claude) only ever deals with a flat list of strings.
type Session = {
  targetArbPath: string;
  targetLanguageCode: string;
  // untranslated keys, index-aligned with the `items` returned to Claude
  keys: string[];
};

type MultiSession = {
  keys: string[];
  missingMap: Record<string, string[]>;
};

interface InitParams {
  arbService: ARBService;
  arbValidationRepository: ARBValidationRepository;
  languageService: LanguageService;
  configService: ConfigService;
  translationCacheRepository: TranslationCacheRepository;
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

  private server?: http.Server;
  private token?: string;
  private bridgeFilePath?: string;
  private sessions = new Map<string, Session>();
  private multiSessions = new Map<string, MultiSession>();

  constructor({
    arbService,
    arbValidationRepository,
    languageService,
    configService,
    translationCacheRepository,
  }: InitParams) {
    this.arbService = arbService;
    this.arbValidationRepository = arbValidationRepository;
    this.languageService = languageService;
    this.configService = configService;
    this.translationCacheRepository = translationCacheRepository;
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
        return this.start_translation(request.languageCode);
      case "finish":
        return this.finish(request.sessionId, request.translations);
      case "start_multi":
        return this.start_multi_translation();
      case "finish_multi":
        return this.finish_multi_translation(
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

  // Existing translations from the user-maintained reference languages — the
  // ones listed in arbConfig.exclude (excluded from auto-translation because
  // the user writes them by hand). Sent as context so Claude can translate UI
  // strings with the right meaning/tone/length instead of guessing from the
  // source language alone.
  private async collectReferenceData(
    translatingLanguageCode: string,
  ): Promise<{ languageName: string; data: Record<string, string> }[]> {
    const sourceARB = await this.arbService.getSourceARB();
    const excludeLanguages = this.arbService.getExcludeLanguageList();
    const result: { languageName: string; data: Record<string, string> }[] = [];
    for (const language of excludeLanguages) {
      if (
        language.languageCode === translatingLanguageCode ||
        language.languageCode === sourceARB.language.languageCode
      ) {
        continue;
      }
      const arbPath = await this.languageService.getARBPathFromLanguageCode(
        language.languageCode,
      );
      const data = await this.readTargetData(arbPath);
      result.push({ languageName: language.name, data });
    }
    return result;
  }

  // action: start — source strings (with reference translations) for one target.
  private async start_translation(languageCode: string): Promise<unknown> {
    const sourceARB = await this.arbService.getSourceARB();
    const targetArbPath =
      await this.languageService.getARBPathFromLanguageCode(languageCode);
    const targetData = await this.readTargetData(targetArbPath);
    const targetLanguage =
      this.languageService.getLanguageByLanguageCode(languageCode);

    const keys = this.getUntranslatedKeys(sourceARB.data, targetData);
    const references = await this.collectReferenceData(languageCode);

    const BATCH_SIZE = 100;
    const totalRemaining = keys.length;
    const batchKeys = keys.slice(0, BATCH_SIZE);

    // Each item carries the source string plus whatever the same key already
    // looks like in other languages, so Claude has full context per string.
    const items = batchKeys.map((key) => {
      const reference: Record<string, string> = {};
      for (const ref of references) {
        const value = ref.data[key];
        if (typeof value === "string" && value !== "") {
          reference[ref.languageName] = value;
        }
      }
      // omit `reference` entirely when there's no reference wording to send
      return Object.keys(reference).length > 0
        ? { source: sourceARB.data[key], reference }
        : { source: sourceARB.data[key] };
    });

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      targetArbPath,
      targetLanguageCode: languageCode,
      keys: batchKeys,
    });
    return {
      sessionId,
      languageCode,
      sourceLanguageName: sourceARB.language.name,
      targetLanguageName: targetLanguage.name,
      count: items.length,
      totalRemaining,
      items,
    };
  }

  // action: finish — validate placeholders, write the passing translations and
  // cache them, return the failing items (index + source) for re-translation.
  private async finish(
    sessionId: string,
    translations: string[],
  ): Promise<unknown> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { error: `Unknown sessionId: ${sessionId}` };
    }
    if (!Array.isArray(translations)) {
      return { error: "translations must be an array" };
    }
    if (translations.length !== session.keys.length) {
      return {
        error: `Expected ${session.keys.length} translations, got ${translations.length}`,
      };
    }

    const sourceARB = await this.arbService.getSourceARB();
    const targetLanguage = this.languageService.getLanguageByLanguageCode(
      session.targetLanguageCode,
    );

    // ensure the target file exists with @@locale, then merge translations in
    this.arbService.createIfNotExist(session.targetArbPath, targetLanguage);
    const existingData = await this.readTargetData(session.targetArbPath);
    const candidateData: Record<string, string> = { ...existingData };
    session.keys.forEach((key, i) => {
      candidateData[key] = translations[i];
    });
    const candidateARB: ARB = {
      filePath: session.targetArbPath,
      language: targetLanguage,
      data: candidateData,
      keys: Object.keys(candidateData),
      values: Object.values(candidateData),
    };

    // reuse the extension's validation (placeholders, line breaks, parentheses)
    const sourceValidation =
      this.arbValidationRepository.getValidation(sourceARB);
    const targetValidation =
      this.arbValidationRepository.getValidation(candidateARB);
    const exclude = this.configService.getTranslationExclude();
    const sessionKeySet = new Set(session.keys);
    const invalidKeys = new Set<string>();

    // Optimize: only validate the keys that were translated in this session
    const sessionSourceValidation: Record<string, any> = {};
    const sessionTargetValidation: Record<string, any> = {};
    for (const k of session.keys) {
      if (sourceValidation[k]) {
        sessionSourceValidation[k] = sourceValidation[k];
      }
      if (targetValidation[k]) {
        sessionTargetValidation[k] = targetValidation[k];
      }
    }

    const generator = this.arbValidationRepository.generateValidationResult(
      exclude,
      sourceARB,
      sessionSourceValidation,
      candidateARB,
      sessionTargetValidation,
    );
    while (true) {
      const { value } = await generator.next();
      if (!value) {
        break;
      }
      if (sessionKeySet.has(value.key)) {
        invalidKeys.add(value.key);
      }
    }

    const failures = session.keys
      .map((key, index) => ({ index, key, source: sourceARB.data[key] }))
      .filter((f) => invalidKeys.has(f.key));

    // write only the passing keys (failing ones are left untouched for retry)
    const passingKeys = session.keys.filter((key) => !invalidKeys.has(key));
    const passingKeySet = new Set(passingKeys);

    // Order the target file by the source key order (mirroring the normal
    // translate flow) so newly written keys land in the same position as in the
    // source ARB instead of being appended at the end.
    const finalData: Record<string, string> = {};
    for (const key of Object.keys(sourceARB.data)) {
      if (key === "@@locale") {
        finalData[key] = targetLanguage.languageCode;
        continue;
      }
      if (passingKeySet.has(key)) {
        finalData[key] = candidateData[key];
      } else if (existingData[key] !== undefined) {
        finalData[key] = existingData[key];
      }
    }
    // Preserve any keys the target had that aren't in the source so we never
    // drop data we weren't asked to touch.
    for (const key of Object.keys(existingData)) {
      if (finalData[key] === undefined) {
        finalData[key] = existingData[key];
      }
    }
    this.arbService.upsert(session.targetArbPath, finalData);

    // cache the passing translations in the same format as the Google flow
    if (passingKeys.length > 0) {
      this.translationCacheRepository.upsertAll(
        passingKeys.map((key) => ({
          cacheKey: new TranslationCacheKey({
            sourceArbValue: sourceARB.data[key],
            sourceLanguage: sourceARB.language,
            targetLanguage,
          }),
          value: candidateData[key],
        })),
      );
    }

    const ok = failures.length === 0;
    if (ok) {
      this.sessions.delete(sessionId);
    }
    return { ok, written: passingKeys.length, failures };
  }

  // action: start_multi
  private async start_multi_translation(): Promise<unknown> {
    const sourceARB = await this.arbService.getSourceARB();
    const targetLanguages = await this.arbService.getTargetLanguageList();
    const missingMap: Record<string, string[]> = {};
    const excludeLanguages = this.arbService.getExcludeLanguageList();
    const excludeSet = this.getExcludeLanguageCodeSet();

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
      const keys = this.getUntranslatedKeys(sourceARB.data, targetData);

      for (const key of keys) {
        if (!missingMap[key]) {
          missingMap[key] = [];
        }
        missingMap[key].push(language.languageCode);
      }
    }

    const allKeys = Object.keys(missingMap);
    const BATCH_SIZE = 5;
    const totalRemaining = allKeys.length;
    const batchKeys = allKeys.slice(0, BATCH_SIZE);

    const referencesByLanguage: Record<string, Record<string, string>> = {};
    for (const language of excludeLanguages) {
      if (language.languageCode === sourceARB.language.languageCode) {
        continue;
      }
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(
          language.languageCode,
        );
      const targetData = await this.readTargetData(targetArbPath);
      referencesByLanguage[language.name] = targetData;
    }

    const items = batchKeys.map((key) => {
      const reference: Record<string, string> = {};
      for (const languageName of Object.keys(referencesByLanguage)) {
        const val = referencesByLanguage[languageName][key];
        if (typeof val === "string" && val !== "") {
          reference[languageName] = val;
        }
      }
      return {
        key,
        source: sourceARB.data[key],
        missingIn: missingMap[key],
        ...(Object.keys(reference).length > 0 ? { reference } : {}),
      };
    });

    const sessionId = crypto.randomUUID();
    this.multiSessions.set(sessionId, { keys: batchKeys, missingMap });

    return {
      sessionId,
      sourceLanguageName: sourceARB.language.name,
      count: items.length,
      totalRemaining,
      items,
    };
  }

  // action: finish_multi
  private async finish_multi_translation(
    sessionId: string,
    translations: Record<string, Record<string, string>>,
  ): Promise<unknown> {
    const session = this.multiSessions.get(sessionId);
    if (!session) {
      return { error: `Unknown sessionId: ${sessionId}` };
    }
    if (!translations || typeof translations !== "object") {
      return { error: "translations must be an object" };
    }

    const sourceARB = await this.arbService.getSourceARB();
    const sourceValidation =
      this.arbValidationRepository.getValidation(sourceARB);
    const exclude = this.configService.getTranslationExclude();

    const updatesByLang: Record<string, Record<string, string>> = {};
    for (const key of session.keys) {
      const keyTranslations = translations[key];
      if (!keyTranslations) {
        continue;
      }
      for (const langCode of session.missingMap[key] || []) {
        if (keyTranslations[langCode]) {
          if (!updatesByLang[langCode]) {
            updatesByLang[langCode] = {};
          }
          updatesByLang[langCode][key] = keyTranslations[langCode];
        }
      }
    }

    let totalWritten = 0;
    const allFailures: any[] = [];

    for (const langCode of Object.keys(updatesByLang)) {
      const candidateUpdates = updatesByLang[langCode];
      const targetLanguage =
        this.languageService.getLanguageByLanguageCode(langCode);
      const targetArbPath =
        await this.languageService.getARBPathFromLanguageCode(langCode);

      this.arbService.createIfNotExist(targetArbPath, targetLanguage);
      const existingData = await this.readTargetData(targetArbPath);

      const candidateData = { ...existingData };
      const sessionKeysForLang: string[] = [];
      for (const key of Object.keys(candidateUpdates)) {
        candidateData[key] = candidateUpdates[key];
        sessionKeysForLang.push(key);
      }

      const candidateARB: ARB = {
        filePath: targetArbPath,
        language: targetLanguage,
        data: candidateData,
        keys: Object.keys(candidateData),
        values: Object.values(candidateData),
      };

      const targetValidation =
        this.arbValidationRepository.getValidation(candidateARB);

      const sessionSourceValidation: Record<string, any> = {};
      const sessionTargetValidation: Record<string, any> = {};
      for (const k of sessionKeysForLang) {
        if (sourceValidation[k]) {
          sessionSourceValidation[k] = sourceValidation[k];
        }
        if (targetValidation[k]) {
          sessionTargetValidation[k] = targetValidation[k];
        }
      }

      const invalidKeys = new Set<string>();
      const generator = this.arbValidationRepository.generateValidationResult(
        exclude,
        sourceARB,
        sessionSourceValidation,
        candidateARB,
        sessionTargetValidation,
      );
      while (true) {
        const { value } = await generator.next();
        if (!value) {
          break;
        }
        if (sessionKeysForLang.includes(value.key)) {
          invalidKeys.add(value.key);
        }
      }

      const passingKeys = sessionKeysForLang.filter((k) => !invalidKeys.has(k));
      const passingKeySet = new Set(passingKeys);

      const failures = sessionKeysForLang
        .filter((k) => invalidKeys.has(k))
        .map((key) => ({
          languageCode: langCode,
          key,
          source: sourceARB.data[key],
        }));
      allFailures.push(...failures);

      const finalData: Record<string, string> = {};
      for (const key of Object.keys(sourceARB.data)) {
        if (key === "@@locale") {
          finalData[key] = targetLanguage.languageCode;
          continue;
        }
        if (passingKeySet.has(key)) {
          finalData[key] = candidateData[key];
        } else if (existingData[key] !== undefined) {
          finalData[key] = existingData[key];
        }
      }
      for (const key of Object.keys(existingData)) {
        if (finalData[key] === undefined) {
          finalData[key] = existingData[key];
        }
      }

      this.arbService.upsert(targetArbPath, finalData);

      if (passingKeys.length > 0) {
        this.translationCacheRepository.upsertAll(
          passingKeys.map((key) => ({
            cacheKey: new TranslationCacheKey({
              sourceArbValue: sourceARB.data[key],
              sourceLanguage: sourceARB.language,
              targetLanguage,
            }),
            value: candidateData[key],
          })),
        );
      }
      totalWritten += passingKeys.length;
    }

    const ok = allFailures.length === 0;
    if (ok) {
      this.multiSessions.delete(sessionId);
    }
    return { ok, written: totalWritten, failures: allFailures };
  }
}
