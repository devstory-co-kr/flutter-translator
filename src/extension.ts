import * as vscode from "vscode";
import { App, FlutterTranslator } from "./app/app";
import { Cmd } from "./app/cmd/cmd";
import { registerMcpCommands } from "./mcp/mcp";

const app: App = new FlutterTranslator();

export function activate(context: vscode.ExtensionContext) {
  // register App
  for (const cmdKey of Object.keys(app.commands)) {
    const cmd: Cmd = <Cmd>cmdKey;
    const disposable = vscode.commands.registerCommand(cmdKey, async (args) => {
      try {
        await app.migrate(context);
        await app.init();
        await app.commands[cmd](args);
      } catch (e) {
        app.onException(e);
      }
    });
    context.subscriptions.push(disposable);
  }

  // register MCP
  registerMcpCommands(context);

  // start the localhost bridge so the MCP server can reuse extension services
  app.startMcpBridge().catch((e) => app.onException(e));
}

export function deactivate() {
  app.disposed();
}
