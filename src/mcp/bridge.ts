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

// Per-key translation session. The extension holds the single ARB key and the
// list of target languages it is missing in, so the MCP side (and Claude) only
// ever deals with one key translated into many languages at a time.
type Session = {
  key: string;
  missingIn: string[];
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
        return this.start_translation();
      case "finish":
        return this.finish_translation(
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
}
