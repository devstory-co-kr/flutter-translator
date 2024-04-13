import * as fs from "fs";
import * as he from "he";
import path from "path";
import * as vscode from "vscode";
import { Cmd } from "../../../cmd/cmd";
import { Dialog } from "../../../util/dialog";
import { Link } from "../../../util/link";
import { Toast } from "../../../util/toast";
import { ConfigService, LanguageCode } from "../../config/config";
import { Language } from "../../language/language";
import { LanguageService } from "../../language/language.service";
import { TranslationResult } from "../../translation/translation";
import { TranslationService } from "../../translation/translation.service";
import { ARB, ARBService } from "../arb";
import { InvalidType, ValidationResult } from "./arb_validation";
import { ARBValidationRepository } from "./arb_validation.repository";

interface InitParams {
  arbService: ARBService;
  configService: ConfigService;
  languageService: LanguageService;
  translationService: TranslationService;
  arbValidationRepository: ARBValidationRepository;
}

enum RetranslateScope {
  selection = "selection",
  type = "type",
  all = "all",
}

export class ARBValidationService {
  private arbService: ARBService;
  private configService: ConfigService;
  private languageService: LanguageService;
  private translationService: TranslationService;
  private arbValidationRepository: ARBValidationRepository;
  constructor({
    arbService,
    configService,
    languageService,
    translationService,
    arbValidationRepository,
  }: InitParams) {
    this.arbService = arbService;
    this.configService = configService;
    this.languageService = languageService;
    this.translationService = translationService;
    this.arbValidationRepository = arbValidationRepository;
  }

  public async getValidationResultList(
    sourceArb: ARB,
    validateLanguages: Language[]
  ): Promise<ValidationResult[]> {
    const generator = this.generateValidationResult(
      sourceArb,
      validateLanguages
    );

    const validationResults: ValidationResult[] = [];
    while (true) {
      const validationResultIterator = await generator.next();
      if (!validationResultIterator.value) {
        break;
      }
      validationResults.push(validationResultIterator.value);
    }

    return validationResults;
  }

  public async validate(
    validationResult: ValidationResult,
    validationResultList: ValidationResult[]
  ): Promise<boolean> {
    const { sourceARB, targetARB, invalidType, invalidMessage, key } =
      validationResult;
    const targetFileName = path.basename(targetARB.filePath);
    // toast
    Toast.i(`${targetFileName} : ${invalidMessage ?? invalidType}.`);

    // highlight
    await this.arbValidationRepository.highlight(
      sourceARB,
      validationResult.targetARB,
      validationResult.key
    );

    switch (invalidType) {
      case InvalidType.keyNotFound:
      case InvalidType.notExcluded:
      case InvalidType.invalidLineBreaks:
      case InvalidType.invalidParameters:
      case InvalidType.invalidParameterName:
      case InvalidType.invalidParentheses:
        const action = await this.selectNextAction(invalidType);
        if (!action) {
          return false;
        }
        if (action === Cmd.GoogleTranslationOpenWeb) {
          // open translation website
          await Link.openGoogleTranslateWebsite({
            sourceLanguage: sourceARB.language,
            targetLanguage: validationResult.targetARB.language,
            text: sourceARB.data[validationResult.key],
            isConfirm: false,
          });
        } else {
          // text translation
          const sameTypeValidationResults = validationResultList.filter(
            (v) => v.invalidType === validationResult.invalidType
          );
          const retranslateScope = await this.selectRetranslateScope({
            nTotal: validationResultList.length,
            nType: sameTypeValidationResults.length,
            invalidType,
          });
          if (!retranslateScope) {
            return false;
          }

          let translateResult: TranslationResult;
          switch (retranslateScope) {
            case RetranslateScope.selection:
              // retranslate only selected item
              translateResult = await this.translationService.translate({
                queries: [sourceARB.data[key]],
                sourceLang: sourceARB.language,
                targetLang: targetARB.language,
                useCache: false,
                isEncodeARBParams: true,
              });
              targetARB.data[key] = translateResult.data[0];
              this.arbService.upsert(targetARB.filePath, targetARB.data);
              break;
            case RetranslateScope.type:
              // translate [validationResult.invalidType]
              translateResult = await this.retranslateAll(
                sameTypeValidationResults
              );
              break;
            case RetranslateScope.all:
              // retranslate all
              translateResult = await this.retranslateAll(validationResultList);
              break;
          }
          Toast.i(
            `🟢 Re-translation Complete. (API: ${translateResult.nAPICall.toLocaleString()}, Cache: ${translateResult.nCache.toLocaleString()})`
          );
        }
        break;
      case InvalidType.undecodedHtmlEntityExists:
        // decode html entities
        const isDecode = await Dialog.showConfirmDialog({
          title: "Decode HTML Entities",
          placeHolder: "Do you want to decode HTML entities?",
        });
        if (isDecode) {
          this.decodeHtmlEntities(targetARB, [key]);
        }
        break;
    }
    return false;
  }

  private async selectNextAction(
    invalidType: InvalidType
  ): Promise<Cmd | undefined> {
    return (
      await vscode.window.showQuickPick(
        [
          {
            label: "Re-translate without cache.",
            data: Cmd.TextTranslate,
          },
          {
            label: "Open Google Translate website",
            data: Cmd.GoogleTranslationOpenWeb,
          },
        ],
        {
          ignoreFocusOut: true,
          title: invalidType,
          placeHolder: "Please select the next action.",
        }
      )
    )?.data;
  }

  private async selectRetranslateScope({
    nType,
    nTotal,
    invalidType,
  }: {
    nType: number;
    nTotal: number;
    invalidType: InvalidType;
  }): Promise<RetranslateScope | undefined> {
    return (
      await vscode.window.showQuickPick(
        [
          {
            label: "Selected item (1)",
            data: RetranslateScope.selection,
          },
          {
            label: `Selected types - ${invalidType} (${nType.toLocaleString()})`,
            data: RetranslateScope.type,
          },
          {
            label: `All (${nTotal.toLocaleString()})`,
            data: RetranslateScope.all,
          },
        ],
        {
          ignoreFocusOut: true,
          title: "Re-translation Scope",
          placeHolder: `Select re-translate scope`,
        }
      )
    )?.data;
  }

  private async retranslateAll(
    validationResultList: ValidationResult[]
  ): Promise<TranslationResult> {
    let nComplete: number = 0;
    const translateResult: TranslationResult = {
      data: [],
      nAPICall: 0,
      nCache: 0,
    };
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        // Group by same target language
        const targetGroup: {
          [targetLangCode: LanguageCode]: ValidationResult[];
        } = {};
        let nGroup = 0;
        for (const v of validationResultList) {
          const targetLangCode = v.targetARB.language.languageCode;
          if (!targetGroup[targetLangCode]) {
            targetGroup[targetLangCode] = [];
            nGroup += 1;
          }
          targetGroup[targetLangCode].push(v);
        }

        for (const targetLangCode of Object.keys(targetGroup)) {
          if (token.isCancellationRequested) {
            // cancel
            Toast.i(`🟠 Canceled`);
            break;
          }
          const sameTarget = targetGroup[targetLangCode];
          const { sourceARB, targetARB } = sameTarget[0];
          const queries = sameTarget.map((v) => v.sourceARB.data[v.key]);

          nComplete += queries.length;
          progress.report({
            increment: 100 / nGroup,
            message: `${nComplete} / ${validationResultList.length} re-translating...`,
          });

          // Translation
          const result = await this.translationService.translate({
            queries,
            sourceLang: sourceARB.language,
            targetLang: targetARB.language,
            useCache: false,
            isEncodeARBParams: true,
          });
          translateResult.data.push(...result.data),
            (translateResult.nCache += result.nCache);
          translateResult.nAPICall += result.nAPICall;
          const translatedTextList = result.data;

          // Upsert
          for (let i = 0; i < sameTarget.length; i++) {
            const { key } = sameTarget[i];
            const translatedText = translatedTextList[i];
            targetARB.data[key] = translatedText;
          }
          this.arbService.upsert(targetARB.filePath, targetARB.data);
        }
      }
    );

    return translateResult;
  }

  public async decodeHtmlEntities(targetArb: ARB, keyList: string[]) {
    const decodedData: Record<string, string> = { ...targetArb.data };
    for (const key of keyList) {
      const text: string | undefined = targetArb.data[key];
      if (text) {
        const decodedText = he.decode(text);
        decodedData[key] = decodedText;
      }
    }
    this.arbService.upsert(targetArb.filePath, decodedData);
  }

  private async *generateValidationResult(
    sourceArb: ARB,
    targetLanguages: Language[]
  ): AsyncGenerator<ValidationResult, undefined, ValidationResult> {
    // get source ParamsValidation
    const sourceValidation =
      this.arbValidationRepository.getValidation(sourceArb);
    if (Object.keys(sourceValidation).length === 0) {
      return;
    }

    const exclude = this.configService.getTranslationExclude();
    for (const targetLanguage of targetLanguages) {
      if (targetLanguage.languageCode === sourceArb.language.languageCode) {
        continue;
      }

      const targetArbFilePath =
        await this.languageService.getARBPathFromLanguageCode(
          targetLanguage.languageCode
        );
      if (!fs.existsSync(targetArbFilePath)) {
        continue;
      }

      // get targetArb
      const targetArb: ARB = await this.arbService.getARB(targetArbFilePath);
      const targetValidation =
        this.arbValidationRepository.getValidation(targetArb);

      // generate validation result
      yield* this.arbValidationRepository.generateValidationResult(
        exclude,
        sourceArb,
        sourceValidation,
        targetArb,
        targetValidation
      );
    }
  }
}
