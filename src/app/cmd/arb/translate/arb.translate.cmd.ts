import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { ARBStatisticService } from "../../../component/arb/statistic/arb_statistic.service";
import { History } from "../../../component/history/history";
import { HistoryService } from "../../../component/history/history.service";
import { Language } from "../../../component/language/language";
import { LanguageRepository } from "../../../component/language/language.repository";
import { LanguageService } from "../../../component/language/language.service";
import { TranslationService } from "../../../component/translation/translation.service";
import { TranslationStatistic } from "../../../component/translation/translation.statistic";
import Batch from "../../../util/batch";
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
  isPreceedValidation?: boolean;
};

export class ARBTranslateCmd {
  private arbService: ARBService;
  private historyService: HistoryService;
  private languageService: LanguageService;
  private translationService: TranslationService;
  private arbStatisticService: ARBStatisticService;
  private willBeTranslated = "will be translated";

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
      args?.targetLanguages ?? LanguageRepository.supportLanguages;
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

    // translate
    await this.translate({
      sourceArb,
      history,
      targetLanguages: selectedTargetLanguages,
    });

    // check translation
    const isPreceedValidation: boolean =
      args?.isPreceedValidation ??
      (await Dialog.showConfirmDialog({
        title: "ARB Check",
        placeHolder: "Would you like to check the translation results?",
      }));
    if (isPreceedValidation) {
      await vscode.commands.executeCommand(Cmd.ARBCheck);
    }
  }

  private async translate({
    sourceArb,
    history,
    targetLanguages,
  }: {
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
          const targetArbFileName =
            await this.languageService.getFileNameFromLanguageCode(
              targetLanguage.languageCode
            );
          totalTranslated += 1;
          progress.report({
            message: `${targetArbFileName} translated. (${totalTranslated} / ${total})`,
          });

          const translationStatistic = await this.translateTargetLanguage({
            sourceArb,
            history,
            targetLanguage,
          });
          if (translationStatistic) {
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
      `Total ${totalTranslated} languages translated. (${totalTranslateStatistic.log})`
    );
  }

  private async translateTargetLanguage({
    sourceArb,
    history,
    targetLanguage,
  }: {
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
      nextTargetArbData[sourceArbKey] = this.willBeTranslated;
      willTranslateData[sourceArbKey] = sourceArb.data[sourceArbKey];
    }

    const willTranslateKeys: string[] = Object.keys(willTranslateData);
    const willTranslateValues: string[] = Object.values(willTranslateData);

    if (willTranslateKeys.length > 0) {
      // translate
      const batchSize = 100;
      const chunkArrayKeys = Batch.chunkArray(willTranslateKeys, batchSize);
      const chunkArrayValues = Batch.chunkArray(willTranslateValues, batchSize);
      for (let i = 0; i < chunkArrayKeys.length; i++) {
        const chunkKeys = chunkArrayKeys[i];
        const chunkValues = chunkArrayValues[i];
        const chunkTranslateResult = await this.translationService.translate({
          queries: chunkValues,
          sourceLang: sourceArb.language,
          targetLang: targetArb.language,
          isEncodeARBParams: true,
        });
        chunkKeys.forEach(
          (key, index) =>
            (nextTargetArbData[key] = chunkTranslateResult.data[index])
        );
        translationStatistic.data.nAPICall = chunkTranslateResult.nAPICall;
        translationStatistic.data.nCache = chunkTranslateResult.nCache;
        // Upsert target arb file
        this.arbService.upsert(
          targetArbFilePath,
          Object.entries(nextTargetArbData).reduce(
            (prev: Record<string, string>, [key, value]) => {
              if (value !== this.willBeTranslated) {
                prev[key] = value;
              }
              return prev;
            },
            {}
          )
        );
      }
    } else {
      // upsert target arb file
      this.arbService.upsert(targetArbFilePath, nextTargetArbData);
    }

    return translationStatistic;
  }
}
