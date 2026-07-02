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
