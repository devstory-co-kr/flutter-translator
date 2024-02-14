import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { ARBStatisticService } from "../../../component/arb/statistic/arb_statistic.service";
import { History } from "../../../component/history/history";
import { HistoryService } from "../../../component/history/history.service";
import { Language } from "../../../component/language/language";
import { LanguageService } from "../../../component/language/language.service";
import { TranslationType } from "../../../component/translation/translation";
import { TranslationService } from "../../../component/translation/translation.service";
import { TranslationStatistic } from "../../../component/translation/translation.statistic";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";
import { Cmd } from "../../cmd";

interface InitParams {
  arbService: ARBService;
  historyService: HistoryService;
  languageService: LanguageService;
  translationService: TranslationService;
  arbStatisticService: ARBStatisticService;
}

export type ARBTranslateCmdArgs = {
  sourceArb?: ARB;
  history?: History;
  targetLanguages?: Language[];
  excludeLanguages?: Language[];
  selectedTargetLanguages?: Language[];
  translationType?: TranslationType;
  isPreceedValidation?: boolean;
};

export class ARBTranslateCmd {
  private arbService: ARBService;
  private historyService: HistoryService;
  private languageService: LanguageService;
  private translationService: TranslationService;
  private arbStatisticService: ARBStatisticService;

  constructor({
    arbService,
    historyService,
    languageService,
    translationService,
    arbStatisticService,
  }: InitParams) {
    this.arbService = arbService;
    this.historyService = historyService;
    this.languageService = languageService;
    this.translationService = translationService;
    this.arbStatisticService = arbStatisticService;
  }

  async run(args?: ARBTranslateCmdArgs) {
    // load source arb
    const sourceArb: ARB =
      args?.sourceArb ?? (await this.arbService.getSourceARB());

    // no data in source arb file
    if (sourceArb.keys.length === 0) {
      Toast.i(`There is no data to translate : ${sourceArb.filePath}`);
      return;
    }

    // get history
    const history: History = args?.history ?? this.historyService.get();

    // support languages
    const targetLanguages: Language[] =
      args?.targetLanguages ?? this.languageService.supportLanguages;
    const excludeLanguages: Language[] =
      args?.excludeLanguages ?? this.arbService.getExcludeLanguageList();

    // show translation preview and select languages to translate
    const selectedTargetLanguages: Language[] =
      args?.selectedTargetLanguages ??
      (await this.arbStatisticService.showTranslationPreview({
        title: "Select Languages",
        placeHolder: "Please select the file you want to translate.",
        sourceArb,
        targetLanguages,
        excludeLanguages,
        history,
      }));
    if (selectedTargetLanguages.length === 0) {
      return;
    }

    // select translation type
    const translationType: TranslationType | undefined =
      args?.translationType ??
      (await this.translationService.selectTranslationType());
    if (!translationType) {
      return;
    }

    // translate
    await this.translate({
      translationType,
      sourceArb,
      history,
      targetLanguages: selectedTargetLanguages,
    });

    // check translation
    const isPreceedValidation: boolean =
      args?.isPreceedValidation ??
      (await Dialog.showConfirmDialog({
        title: "Would you like to check the translation results?",
      }));
    if (isPreceedValidation) {
      await vscode.commands.executeCommand(Cmd.ARBCheck);
    }
  }

  async translate({
    translationType,
    sourceArb,
    history,
    targetLanguages,
  }: {
    translationType: TranslationType;
    sourceArb: ARB;
    history: History;
    targetLanguages: Language[];
  }) {
    const translationStatisticList: TranslationStatistic[] = [];

    // show progress
    const total = targetLanguages.length;
    let totalTranslated: number = 0;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const targetLanguage of targetLanguages) {
          if (token.isCancellationRequested) {
            // cancel
            Toast.i(`🟠 Canceled`);
            break;
          }
          totalTranslated += 1;
          const translationStatistic = await this.translateTargetLanguage({
            translationType,
            sourceArb,
            history,
            targetLanguage,
          });
          if (translationStatistic) {
            const targetArbFileName =
              await this.languageService.getFileNameFromLanguageCode(
                targetLanguage.languageCode
              );

            progress.report({
              increment: 100 / total,
              message: `${targetArbFileName} translated. (${totalTranslated} / ${total})`,
            });
            translationStatisticList.push(translationStatistic);
          }
        }
      }
    );

    // create arb history
    this.historyService.update(sourceArb.data);
    const totalTranslateStatistic = translationStatisticList.reduce(
      (prev, curr) => {
        return prev.sum(curr);
      },
      new TranslationStatistic()
    );
    Toast.i(
      `Total ${totalTranslated} languages translated. (${translationType.toString()} ${
        totalTranslateStatistic.log
      })`
    );
  }

  private async translateTargetLanguage({
    translationType,
    sourceArb,
    history,
    targetLanguage,
  }: {
    translationType: TranslationType;
    sourceArb: ARB;
    history: History;
    targetLanguage: Language;
  }): Promise<TranslationStatistic | undefined> {
    if (targetLanguage.languageCode === sourceArb.language.languageCode) {
      // skip source arb file
      return;
    }

    const targetArbFilePath =
      await this.languageService.getARBPathFromLanguageCode(
        targetLanguage.languageCode
      );
    // create target arb file if does not exist
    this.arbService.createIfNotExist(targetArbFilePath, targetLanguage);

    // get targetArb file
    const targetArb: ARB = await this.arbService.getARB(targetArbFilePath);

    // translation target classification
    const nextTargetArbData: Record<string, string> = {};
    const willTranslateData: Record<string, string> = {};

    // statistic
    const translationStatistic = new TranslationStatistic();
    for (const sourceArbKey of sourceArb.keys) {
      if (sourceArbKey === "@@locale") {
        nextTargetArbData[sourceArbKey] = targetArb.language.languageCode;
        continue;
      } else if (sourceArbKey.indexOf("@") !== -1) {
        continue;
      }

      const isKeyInHistory: boolean = history.keys.includes(sourceArbKey);
      const isKeyInTargetArb: boolean = targetArb.keys.includes(sourceArbKey);
      if (isKeyInHistory && isKeyInTargetArb) {
        const sourceArbValue = sourceArb.data[sourceArbKey];
        const historyArbValue = history.data[sourceArbKey];
        if (sourceArbValue === historyArbValue) {
          // skip
          nextTargetArbData[sourceArbKey] = targetArb.data[sourceArbKey];
          translationStatistic.data.nSkip += 1;
          continue;
        }
      }

      // create & update
      // remove deleted items by adding only the key of sourceArbFile
      if (isKeyInTargetArb) {
        translationStatistic.data.nUpdate += 1;
      } else {
        translationStatistic.data.nCreate += 1;
      }
      nextTargetArbData[sourceArbKey] = "will be translated";
      willTranslateData[sourceArbKey] = sourceArb.data[sourceArbKey];
    }

    const willTranslateKeys: string[] = Object.keys(willTranslateData);
    const willTranslateValues: string[] = Object.values(willTranslateData);
    const nWillTranslate: number = willTranslateKeys.length;
    if (nWillTranslate > 0) {
      // translate
      const translateResult = await this.translationService.translate({
        type: translationType,
        queries: willTranslateValues,
        sourceLang: sourceArb.language,
        targetLang: targetArb.language,
      });
      willTranslateKeys.forEach(
        (key, index) => (nextTargetArbData[key] = translateResult.data[index])
      );
      translationStatistic.data.nAPICall = translateResult.nAPICall;
      translationStatistic.data.nCache = translateResult.nCache;
    }

    // upsert target arb file
    this.arbService.upsert(targetArbFilePath, nextTargetArbData);
    return translationStatistic;
  }
}
