import * as vscode from "vscode";
import { Language } from "../../component/language/language";
import { LanguageRepository } from "../../component/language/language.repository";
import { TranslationService } from "../../component/translation/translation.service";
import { Toast } from "../../util/toast";

interface InitParams {
  translationService: TranslationService;
}

export type TextTranslateCmdArgs = {
  queries: string[];
  selections: vscode.Selection[];
  sourceLang: Language;
  targetLang: Language;
  useCache: boolean;
  showCompleteNoti: boolean;
};

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
    const selections = args?.selections ?? editor.selections;
    if (
      selections.length === 1 &&
      editor.document.getText(selections[0]).length === 0
    ) {
      Toast.i("Please select the text you want to translate.");
      return;
    }

    const queries =
      args?.queries ?? selections.map((s) => editor.document.getText(s));

    // select source language
    let sourceLang: Language | undefined = args?.sourceLang;
    if (!sourceLang) {
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
      sourceLang = sourceSelection.language;
    }

    // select target language
    let targetLang: Language | undefined = args?.targetLang;
    if (!targetLang) {
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
      targetLang = targetSelection.language;
    }

    // translate
    const translatedTextList = await this.translationService.translate({
      queries,
      sourceLang,
      targetLang,
      useCache: args?.useCache,
    });

    await editor.edit((editBuilder) => {
      for (let i = 0; i < selections.length; i++) {
        const selection = selections[i];
        const translatedText = translatedTextList.data[i];
        editBuilder.replace(selection, translatedText);
      }
    });

    if (args?.showCompleteNoti ?? true) {
      Toast.i("🟢 Translated.");
    }
  }
}
