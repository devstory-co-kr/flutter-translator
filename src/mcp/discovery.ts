import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Bridge discovery files live OUTSIDE the workspace (per-user tmp dir) so the
// extension never writes runtime files into user projects. Each VS Code window
// writes one file named after the hash of its (real) workspace path; the MCP
// server finds it by hashing its own cwd ancestors. Single source of truth for
// both sides — extension (bridge.ts) and standalone MCP server (server.ts).
export const BRIDGE_DIR = path.join(os.tmpdir(), "flutter-translator-mcp");

export function bridgeFilePath(workspacePath: string): string {
  const hash = crypto
    .createHash("sha1")
    .update(realpathOrSelf(workspacePath))
    .digest("hex");
  return path.join(BRIDGE_DIR, `${hash}.json`);
}

// Resolve symlinks/case so the extension (workspace fsPath) and the MCP server
// (process cwd) hash the same canonical path.
function realpathOrSelf(p: string): string {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return p;
  }
}
