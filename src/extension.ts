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

  // register MCP; the register command also starts the bridge so a first-time
  // workspace works without a reload
  registerMcpCommands(context, () =>
    app.startMcpBridge().catch((e) => app.onException(e))
  );

  // start the localhost bridge so the MCP server can reuse extension services
  // (its discovery file lives in the tmp dir, so no workspace files are made)
  app.startMcpBridge().catch((e) => app.onException(e));
}

export function deactivate() {
  app.disposed();
}
