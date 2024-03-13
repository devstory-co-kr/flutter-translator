import * as vscode from "vscode";
import { Language } from "../component/language/language";
import { Constant } from "./constant";
import { Dialog } from "./dialog";

export class Link {
  static show(url: string) {
    vscode.env.openExternal(vscode.Uri.parse(url));
  }

  static showHomePage() {
    vscode.env.openExternal(vscode.Uri.parse(Constant.homePage));
  }

  static async openGoogleTranslateWebsite({
    sourceLanguage,
    targetLanguage,
    text,
    isConfirm,
  }: {
    sourceLanguage?: Language;
    targetLanguage?: Language;
    text: string;
    isConfirm?: boolean;
  }) {
    if (isConfirm ?? true) {
      const isShow = await Dialog.showConfirmDialog({
        title: "Open Google Translate Website",
        placeHolder: "Do you want to open the Google Translate website?",
      });
      if (!isShow) {
        return;
      }
    }

    const sl = sourceLanguage?.gt ?? "auto";
    const tl = targetLanguage?.gt ?? "auto";
    const url = `https://translate.google.co.kr/?sl=${sl}&tl=${tl}&text=${text}&op=translate`;
    Link.show(url);
  }
}
