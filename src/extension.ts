import * as vscode from "vscode";
import { App, FlutterTranslator } from "./app/app";
import { Cmd } from "./app/cmd/cmd";

const app: App = new FlutterTranslator();

export function activate(context: vscode.ExtensionContext) {
  // register command
  for (const cmdKey of Object.keys(app.commands)) {
    const cmd: Cmd = <Cmd>cmdKey;
    const disposable = vscode.commands.registerCommand(cmdKey, async (args) => {
      try {
        await app.migrate(context);
        await app.init();
        app.commands[cmd](args);
      } catch (e) {
        app.onException(e);
      }
    });
    context.subscriptions.push(disposable);
  }
}

export function deactivate() {
  app.disposed();
}
