import * as vscode from "vscode";
import { App, ArbTranslator } from "./app/app";
import { Cmd } from "./app/command/cmd";

const app: App = new ArbTranslator();

export function activate(context: vscode.ExtensionContext) {

  // register command
  for (const cmdKey of Object.keys(app.commands)) {
    const cmd: Cmd = <Cmd>cmdKey;
    const disposable = vscode.commands.registerCommand(cmdKey, async () => {
      try {
        await app.init();
        await app.commands[cmd](context);
      } catch (e) {
        await app.onException(e);
      }
    });
    context.subscriptions.push(disposable);
  }
}

export function deactivate() {
  app.disposed()
}
