import * as vscode from "vscode";
import { LanguageRepository } from "../../component/language/language.repository";
import { TranslationService } from "../../component/translation/translation.service";
import { Toast } from "../../util/toast";

interface InitParams {
  translationService: TranslationService;
}

export type TextTranslateCmdArgs = {};

export class TextTranslateCmd {
  private translationService: TranslationService;
  constructor({ translationService }: InitParams) {
    this.translationService = translationService;
  }

  public async run(args?: TextTranslateCmdArgs) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      Toast.i("No active editor found.");
      return;
    }

    // check selections
    if (
      editor.selections.length === 1 &&
      editor.document.getText(editor.selections[0]).length === 0
    ) {
      Toast.i("Please select the text you want to translate.");
      return;
    }

    // select source language
    const sourceSelection = await vscode.window.showQuickPick(
      [LanguageRepository.auto, ...LanguageRepository.supportLanguages].map(
        (l) => ({
          label: `${l.name} (${l.languageCode})`,
          language: l,
        })
      ),
      {
        title: "Select source language",
        placeHolder: "Please select a translation source language.",
        ignoreFocusOut: true,
      }
    );
    if (!sourceSelection) {
      return;
    }
    const sourceLang = sourceSelection.language;

    // select target language
    const targetSelection = await vscode.window.showQuickPick(
      LanguageRepository.supportLanguages.map((l) => ({
        label: `${l.name} (${l.languageCode})`,
        language: l,
      })),
      {
        title: "Select target language",
        placeHolder:
          "Please select the target language you want to translate to",
        ignoreFocusOut: true,
      }
    );
    if (!targetSelection) {
      return;
    }
    const targetLang = targetSelection.language;

    // translate
    const translatedTextList = await this.translationService.translate({
      queries: editor.selections.map((s) => editor.document.getText(s)),
      sourceLang,
      targetLang,
    });

    await editor.edit((editBuilder) => {
      for (let i = 0; i < editor.selections.length; i++) {
        const selection = editor.selections[i];
        const translatedText = translatedTextList.data[i];
        editBuilder.replace(selection, translatedText);
      }
    });

    Toast.i("🟢 Translated.");
  }
}
