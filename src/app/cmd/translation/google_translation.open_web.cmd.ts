import * as vscode from "vscode";
import { Link } from "../../util/link";

interface InitParams {}

export type GoogleTranslationOpenWebCmdArgs = {};

export class GoogleTranslationOpenWebCmd {
  constructor({}: InitParams) {}

  public async run(args?: GoogleTranslationOpenWebCmdArgs) {
    // Get text from selection
    const editor = vscode.window.activeTextEditor;
    const queries =
      editor?.selections.map((s) => editor.document.getText(s)) ?? [];
    const query = queries.join(" ");

    // Confirm text
    const text = await vscode.window.showInputBox({
      value: query,
      placeHolder: "Please enter the text you want to translate.",
    });
    if (!text) {
      return;
    }

    await Link.openGoogleTranslateWebsite({
      text,
      isConfirm: false,
    });
  }
}
