import { execFile } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { Toast } from "../app/util/toast";

// Registers the bundled stdio MCP server with Claude Code at user scope.
// User scope (~/.claude.json) is enabled by default, so this avoids the
// project `.mcp.json` approval prompt entirely. `claude mcp add` errors when
// an entry already exists, so we remove any prior entry first. This keeps the
// absolute path current after extension updates (e.g. 2.6.0 -> 2.6.1).
function runClaude(args: string[]): Promise<{ error: Error | null; stderr: string }> {
  return new Promise((resolve) => {
    execFile("claude", args, (error, _stdout, stderr) => {
      resolve({ error, stderr });
    });
  });
}

async function registerClaudeCodeMcp(context: vscode.ExtensionContext): Promise<void> {
  const serverPath = path.join(context.extensionPath, "out", "mcp", "server.js");

  // Remove any stale entry first; ignore "not found" so a fresh install works.
  await runClaude(["mcp", "remove", "flutter-translator", "-s", "user"]);

  const { error, stderr } = await runClaude([
    "mcp",
    "add",
    "flutter-translator",
    "-s",
    "user",
    "--",
    "node",
    serverPath,
  ]);

  if (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      Toast.e(
        "Claude Code CLI not found. Install Claude Code and ensure the `claude` command is on your PATH."
      );
    } else {
      Toast.e(`Failed to register MCP server: ${stderr || error.message}`, error);
    }
  } else {
    Toast.i("Registered Flutter Translator MCP server with Claude Code.");
  }
}

// Infrastructure command: registers the bundled MCP server with Claude Code.
// Kept out of the registry pipeline since it needs no workspace and depends
// on context.extensionPath. `startBridge` force-starts the localhost bridge
// so the first registration in a workspace works without a window reload
// (activation only auto-starts the bridge in workspaces already using the
// extension).
export function registerMcpCommands(
  context: vscode.ExtensionContext,
  startBridge: () => Promise<void>
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "flutter-translator.mcp.register",
      async () => {
        await registerClaudeCodeMcp(context);
        await startBridge();
      }
    )
  );
}
