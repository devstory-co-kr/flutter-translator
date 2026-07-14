import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { bridgeFilePath } from "./discovery";

// Bundled stdio MCP server. It owns no translation logic — every tool forwards
// to the VS Code extension's localhost HTTP bridge, which reuses the
// extension's ARB and IAP services (config, validation, cache). The bridge
// discovery file is written by the extension into the per-user tmp dir, named
// after the workspace path hash (see discovery.ts) — never into the workspace.

const BRIDGE_HELP =
  "Could not reach the Flutter Translator extension. Open the project in VS " +
  "Code with the Flutter Translator extension enabled, then run Claude from " +
  "inside that project folder.";

type Bridge = { port: number; token: string };

// Walk up from the MCP process cwd, hashing each ancestor, to find the bridge
// file the extension wrote for the workspace this `claude` was launched in.
function findBridge(): Bridge {
  let dir = process.cwd();
  while (true) {
    const candidate = bridgeFilePath(dir);
    if (fs.existsSync(candidate)) {
      return JSON.parse(fs.readFileSync(candidate, "utf-8")) as Bridge;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(BRIDGE_HELP);
    }
    dir = parent;
  }
}

function callBridge(payload: Record<string, unknown>): Promise<any> {
  const bridge = findBridge();
  const body = JSON.stringify({ ...payload, token: bridge.token });
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: bridge.port,
        method: "POST",
        path: "/",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", () => reject(new Error(BRIDGE_HELP)));
    req.write(body);
    req.end();
  });
}

function asResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value),
      },
    ],
  };
}

async function main() {
  // MCP SDK is ESM-only; load via dynamic import so this CJS bundle (tsc) works.
  // zod is loaded the same way to share a single instance with the SDK.
  const { McpServer } = await import(
    "@modelcontextprotocol/sdk/server/mcp.js"
  );
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const { z } = await import("zod");

  const server = new McpServer({
    name: "flutter-translator",
    version: "0.1.0",
  });

  server.registerTool(
    "list_targets",
    {
      title: "List ARB translation targets",
      description:
        "List target languages that have untranslated strings, with the " +
        "count for each. Call this first to see what needs translating.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "list" }))
  );

  server.registerTool(
    "start_translation",
    {
      title: "Start ARB translation for one key",
      description:
        "Get ONE untranslated key together with every target language it is " +
        "still missing in. Returns a sessionId, totalRemaining (the number of " +
        "keys still missing somewhere across the project), and a single " +
        "`item`: { key, source, missingIn: [lang1, lang2, ...], reference }. " +
        "Translate the `source` string into EVERY language code listed in " +
        "`missingIn` in one pass. `reference` maps language names to the same " +
        "key's wording in the user's hand-maintained reference languages " +
        "(e.g. Korean) — use it to match the intended meaning, tone, and " +
        "length rather than translating the source literally. These are " +
        "Flutter app UI strings (button labels, status text, messages), so " +
        "keep translations concise and natural for an app UI and preserve " +
        "placeholders like {count}. Then call finish_translation with the " +
        "translations for this key, then call start_translation again for the " +
        "next key. Repeat until totalRemaining is 0.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "start" }))
  );

  server.registerTool(
    "finish_translation",
    {
      title: "Finish ARB translation for one key",
      description:
        "Submit the translations for the key returned by start_translation. " +
        "Pass `sessionId` and `translations` as SEPARATE structured arguments. " +
        "Do NOT serialize the whole input into one big raw JSON string — a " +
        "single raw blob gets truncated mid-content on long payloads (many " +
        "languages) and then fails to parse. `translations` is an object " +
        'mapping each target language code to its translated string, e.g. ' +
        '{ "fr": "Bonjour", "es": "Hola" }. Write each value as literal ' +
        "Unicode characters (the actual ಕನ್ನಡ / 日本語 glyphs), not \\uXXXX " +
        "escape sequences, and keep it on a single line: escapes bloat the " +
        "payload ~6x and make truncation far more likely. The extension " +
        "validates placeholders, writes and caches the passing translations " +
        "immediately, and returns any failing items as { languageCode, key, " +
        "source } for re-translation. On success, call start_translation again " +
        "for the next key.",
      inputSchema: {
        sessionId: z.string().describe("sessionId from start_translation"),
        translations: z
          .record(z.string(), z.string())
          .describe(
            "Object mapping each target language code to its translated string"
          ),
      },
    },
    async ({
      sessionId,
      translations,
    }: {
      sessionId: string;
      translations: Record<string, string>;
    }) =>
      asResult(await callBridge({ action: "finish", sessionId, translations }))
  );

  server.registerTool(
    "list_iap_targets",
    {
      title: "List IAP translation targets",
      description:
        "List in-app purchase (App Store / Play Store product & subscription " +
        "listing) fields to translate, grouped by { platform (android|ios), " +
        "target (plans|subscriptionGroups), count }. `count` is the FULL " +
        "re-translate workload — (field × target locale) pairs — NOT how many " +
        "are currently missing: every target locale is (re)translated from " +
        "English each run, so this number stays the same whether or not the " +
        "locales are already translated. Korean/English are hand-maintained " +
        "and not included. This is the entry point for the translation loop " +
        "(then loop start_iap_translation / finish_iap_translation like the " +
        "ARB tools); it is NOT a status or validation check. To verify already " +
        "written IAP strings (e.g. store character-limit violations), use " +
        "check_iap_translations instead.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "iap_list" }))
  );

  server.registerTool(
    "start_iap_translation",
    {
      title: "Start IAP translation for one field",
      description:
        "Get ONE in-app purchase field together with every target locale to " +
        "translate it into. Returns a sessionId, totalRemaining (fields left " +
        "to process), and a single `item`: { platform, target, fileName, " +
        "field (title|description|benefit|name|custom_app_name), maxLength (the " +
        "store's hard character limit for this field; `benefit` is one element " +
        "of an Android plan's benefits list, each handed to you separately), " +
        "source (the English " +
        "wording), targetLocales: [locale1, locale2, ...], reference }. The " +
        "source is always English; every target locale is (re)translated. " +
        "Translate `source` into EVERY locale in `targetLocales` in one pass. " +
        "`reference` maps language names to the same " +
        "field's wording in the user's hand-maintained locales (e.g. Korean) " +
        "— match its meaning and tone rather than translating literally. These " +
        "are store listing strings, so keep them concise, natural, and at or " +
        "under maxLength characters (translations over the limit are rejected). " +
        "Then call finish_iap_translation with the translations for this " +
        "field, then call start_iap_translation again. Repeat until " +
        "totalRemaining is 0.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "iap_start" }))
  );

  server.registerTool(
    "finish_iap_translation",
    {
      title: "Finish IAP translation for one field",
      description:
        "Submit the translations for the field returned by " +
        "start_iap_translation. Pass `sessionId` and `translations` as SEPARATE " +
        "structured arguments (do NOT serialize into one raw JSON string). " +
        "`translations` maps each target locale to its translated string, e.g. " +
        '{ "ja-JP": "…", "de-DE": "…" }. Write each value as literal Unicode ' +
        "characters, not \\uXXXX escapes, on a single line. The extension " +
        "validates each value against the store character limit, writes the " +
        "passing ones into the IAP JSON immediately, and returns any failing " +
        "items as { locale, field, reason } for re-translation (shorten and " +
        "resubmit those). On success, call start_iap_translation again for the " +
        "next field.",
      inputSchema: {
        sessionId: z.string().describe("sessionId from start_iap_translation"),
        translations: z
          .record(z.string(), z.string())
          .describe(
            "Object mapping each target locale to its translated string"
          ),
      },
    },
    async ({
      sessionId,
      translations,
    }: {
      sessionId: string;
      translations: Record<string, string>;
    }) =>
      asResult(
        await callBridge({ action: "iap_finish", sessionId, translations })
      )
  );

  server.registerTool(
    "check_iap_translations",
    {
      title: "Check all IAP translations",
      description:
        "Verify every written in-app purchase string across all files, AND " +
        "report locales that are still untranslated (missing/empty while the " +
        "en-US source has a value). Use this to answer \"is anything not " +
        "translated?\". Runs the extension's full check: untranslated target " +
        "locales (type \"Untranslated\"), each field's length against the " +
        "store limit, AND custom_app_name consistency (all or none of a " +
        "subscription group's locales must set it). Returns { ok, issues } " +
        "where each issue is { type, platform, file, locale, reason }. When " +
        "`ok` is false, fix the reported fields — for an Untranslated locale " +
        "run the start_iap_translation / finish_iap_translation loop; for a " +
        "too-long field, shorten it — then call this again until `ok` is true " +
        "and `issues` is empty.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "iap_check" }))
  );

  server.registerTool(
    "start_changelog_translation",
    {
      title: "Start changelog translation",
      description:
        "Translate the app store changelog (release notes) of the CURRENT " +
        "build number (from pubspec.yaml) into every store locale. Call this " +
        "WITHOUT sourceLocale first: it returns { buildNumber, candidates } — " +
        "the Android locales whose changelog for this build exists and is " +
        "non-empty. ASK THE USER in conversation which candidate to use as " +
        "the translation source (if there is exactly one, you may proceed " +
        "with it and just tell the user; if there are none, ask the user to " +
        "write the changelog first). Then call again WITH that sourceLocale. " +
        "That call returns { sessionId, buildNumber, sourceLanguageName, " +
        "pasted (same-language locales the extension already copied the " +
        "source text into), item: { source, targetLanguages: [{ languageCode, " +
        "name, maxLength, locales }], reference } }. Translate `source` into " +
        "EVERY languageCode listed — ONE translation per language, which the " +
        "extension writes to all of that language's platform locales. Keep " +
        "each translation at or under its maxLength characters (the " +
        "strictest store limit across its locales; Android caps changelogs " +
        "at 500). `reference` maps language names to the user's " +
        "hand-maintained changelog wording (e.g. Korean) — match its meaning " +
        "and tone rather than translating the source literally. These are " +
        "user-facing release notes, so keep them natural. Then call " +
        "finish_changelog_translation with the translations, and finally " +
        "check_changelog_translations to verify.",
      inputSchema: {
        sourceLocale: z
          .string()
          .optional()
          .describe(
            "Android locale of the source changelog, chosen by the user " +
              "from `candidates`. Omit on the first call to get the candidates."
          ),
      },
    },
    async ({ sourceLocale }: { sourceLocale?: string }) =>
      asResult(await callBridge({ action: "changelog_start", sourceLocale }))
  );

  server.registerTool(
    "finish_changelog_translation",
    {
      title: "Finish changelog translation",
      description:
        "Submit the changelog translations for the session returned by " +
        "start_changelog_translation. Pass `sessionId` and `translations` as " +
        "SEPARATE structured arguments (do NOT serialize into one raw JSON " +
        "string). `translations` maps each languageCode (NOT locale) to its " +
        'translated changelog text, e.g. { "fr": "…", "ja": "…" }. Multi-line ' +
        "text is fine; write literal Unicode characters, not \\uXXXX escapes. " +
        "The extension validates each text against the store length limit, " +
        "writes the passing ones to every matching platform locale file " +
        "immediately, and returns any failing targets as { platform, locale, " +
        "languageCode, maxLength, reason } — shorten those languages and " +
        "resubmit them with the SAME sessionId. When `ok` is true, run " +
        "check_changelog_translations to verify the final state.",
      inputSchema: {
        sessionId: z
          .string()
          .describe("sessionId from start_changelog_translation"),
        translations: z
          .record(z.string(), z.string())
          .describe(
            "Object mapping each languageCode to its translated changelog text"
          ),
      },
    },
    async ({
      sessionId,
      translations,
    }: {
      sessionId: string;
      translations: Record<string, string>;
    }) =>
      asResult(
        await callBridge({ action: "changelog_finish", sessionId, translations })
      )
  );

  server.registerTool(
    "check_changelog_translations",
    {
      title: "Check all changelogs",
      description:
        "Check every changelog of the current build number across Android " +
        "and iOS: missing files, empty files, and texts over the store " +
        "length limit. Returns { ok, issues } where each issue is { type " +
        '("Not Exist"|"Empty"|"Overflow"), platform, locale, filePath }. ' +
        "Issues in the source or hand-maintained (changelogExclude) locales " +
        "must be fixed by the user by hand; for other locales run the " +
        "start_changelog_translation / finish_changelog_translation loop " +
        "(or shorten an Overflow text), then call this again until `ok` is " +
        "true and `issues` is empty.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "changelog_check" }))
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  // stdout is reserved for the MCP protocol; only log to stderr.
  process.stderr.write(
    `[flutter-translator mcp] fatal: ${err?.stack ?? err}\n`
  );
  process.exit(1);
});
