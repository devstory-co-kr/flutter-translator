import * as fs from "fs";
import * as http from "http";
import * as path from "path";

// Bundled stdio MCP server. It owns no ARB logic — every tool forwards to the
// VS Code extension's localhost HTTP bridge, which reuses the extension's ARB
// services (config, validation, cache). The bridge discovery file is written by
// the extension into <workspace>/.vscode/flutter-translator/mcp-bridge.json.
const BRIDGE_FILE = path.join(
  ".vscode",
  "flutter-translator",
  "mcp-bridge.json"
);

const BRIDGE_HELP =
  "Could not reach the Flutter Translator extension. Open the project in VS " +
  "Code with the Flutter Translator extension enabled, then run Claude from " +
  "inside that project folder.";

type Bridge = { port: number; token: string };

// Walk up from the MCP process cwd to find the bridge file written by the
// extension for the workspace this `claude` was launched in.
function findBridge(): Bridge {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, BRIDGE_FILE);
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
      title: "Start ARB translation for one language",
      description:
        "Get a batch of untranslated strings for one target language (max 100). " +
        "Returns a sessionId, total remaining count, the source/target language names, and an `items` array " +
        "(in order). Each item is { source, reference } where `source` is the " +
        "string to translate and `reference` maps language names to the same " +
        "key's wording in the user's hand-maintained reference languages " +
        "(e.g. Korean). These are Flutter app UI strings (button labels, " +
        "status text, messages), so keep translations concise and natural for " +
        "an app UI, and use `reference` to match the intended meaning, tone, " +
        "and length rather than translating the source literally. Preserve " +
        "placeholders like {count}. Then call finish_translation with one " +
        "translated string per item, in the same order. " +
        "If totalRemaining > items.length, repeat start_translation & finish_translation until all are translated. " +
        "IMPORTANT: If the average number of untranslated strings per target language is 10 or less, " +
        "DO NOT use this tool. Use `start_multi_translation` instead.",
      inputSchema: {
        languageCode: z
          .string()
          .describe("Target language code from list_targets (e.g. 'fr')"),
      },
    },
    async ({ languageCode }: { languageCode: string }) =>
      asResult(await callBridge({ action: "start", languageCode }))
  );

  server.registerTool(
    "finish_translation",
    {
      title: "Finish ARB translation",
      description:
        "Submit translated strings for a session. The extension validates " +
        "placeholders, writes the passing translations, caches them, and " +
        "returns any failing items as { index, source } for re-translation. " +
        "On failure, fix those indices and call finish_translation again with " +
        "the full translations array.",
      inputSchema: {
        sessionId: z.string().describe("sessionId from start_translation"),
        translations: z
          .array(z.string())
          .describe(
            "Translated strings, same order and length as the items array"
          ),
      },
    },
    async ({
      sessionId,
      translations,
    }: {
      sessionId: string;
      translations: string[];
    }) =>
      asResult(await callBridge({ action: "finish", sessionId, translations }))
  );

  server.registerTool(
    "start_multi_translation",
    {
      title: "Start multi-language translation for missing keys",
      description:
        "Get a batch of untranslated keys across ALL target languages. " +
        "Use this tool when translating a small number of strings into many languages. " +
        "Returns a sessionId, total remaining keys, and an `items` array (max 5 keys). " +
        "Each item is { key, source, missingIn: [lang1, lang2...], reference }. " +
        "You must translate the `source` string into ALL languages listed in `missingIn`. " +
        "Then call finish_multi_translation.",
      inputSchema: {},
    },
    async () => asResult(await callBridge({ action: "start_multi" }))
  );

  server.registerTool(
    "finish_multi_translation",
    {
      title: "Finish multi-language translation",
      description:
        "Submit translated strings for a multi-language session. " +
        "You must provide a nested object mapping each `key` to its translations for each language. " +
        "For example: { \"title_key\": { \"fr\": \"Bonjour\", \"es\": \"Hola\" } }. " +
        "If the previous start_multi_translation returned totalRemaining > items.length, " +
        "call start_multi_translation again to get the next batch of keys.",
      inputSchema: {
        sessionId: z.string().describe("sessionId from start_multi_translation"),
        translations: z
          .record(z.string(), z.record(z.string(), z.string()))
          .describe(
            "Nested object: { [key: string]: { [languageCode: string]: string } }"
          ),
      },
    },
    async ({
      sessionId,
      translations,
    }: {
      sessionId: string;
      translations: Record<string, Record<string, string>>;
    }) =>
      asResult(await callBridge({ action: "finish_multi", sessionId, translations }))
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
