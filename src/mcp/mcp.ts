import { execFile } from "child_process";
import * as path from "path";
import * as vscode from "vscode";
import { Toast } from "../app/util/toast";

// Registers the bundled stdio MCP server with Claude Code at user scope.
// User scope (~/.claude.json) is enabled by default, so this avoids the
// project `.mcp.json` approval prompt entirely. Re-running overwrites the
// existing entry, keeping the absolute path current after extension updates.
function registerClaudeCodeMcp(context: vscode.ExtensionContext): Promise<void> {
  const serverPath = path.join(context.extensionPath, "out", "mcp", "server.js");
  return new Promise<void>((resolve) => {
    execFile(
      "claude",
      ["mcp", "add", "flutter-translator", "-s", "user", "--", "node", serverPath],
      (error, _stdout, stderr) => {
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
        resolve();
      }
    );
  });
}

// Infrastructure command: registers the bundled MCP server with Claude Code.
// Kept out of the registry pipeline since it needs no workspace and depends
// on context.extensionPath.
export function registerMcpCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("flutter-translator.mcp.register", () =>
      registerClaudeCodeMcp(context)
    )
  );
}
