import * as fs from "fs";
import * as he from "he";
import path from "path";
import * as vscode from "vscode";
import { Cmd } from "../../../cmd/cmd";
import { Dialog } from "../../../util/dialog";
import { Link } from "../../../util/link";
import { Toast } from "../../../util/toast";
import { ConfigService } from "../../config/config";
import { Language } from "../../language/language";
import { LanguageService } from "../../language/language.service";
import { ARB, ARBService } from "../arb";
import { InvalidType, ValidationResult } from "./arb_validation";
import { ARBValidationRepository } from "./arb_validation.repository";

interface InitParams {
  arbService: ARBService;
  configService: ConfigService;
  languageService: LanguageService;
  arbValidationRepository: ARBValidationRepository;
}

export class ARBValidationService {
  private arbService: ARBService;
  private configService: ConfigService;
  private languageService: LanguageService;
  private arbValidationRepository: ARBValidationRepository;
  constructor({
    arbService,
    configService,
    languageService,
    arbValidationRepository,
  }: InitParams) {
    this.arbService = arbService;
    this.configService = configService;
    this.languageService = languageService;
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

    switch (validationResult.invalidType) {
      case InvalidType.notExcluded:
      case InvalidType.keyNotFound:
      case InvalidType.invalidLineBreaks:
      case InvalidType.invalidParameters:
      case InvalidType.invalidParentheses:
        const selection = await vscode.window.showQuickPick(
          [
            {
              label: "Retranslate without cache.",
              data: Cmd.TextTranslate,
            },
            {
              label: "Open Google Translate website",
              data: Cmd.GoogleTranslationOpenWeb,
            },
          ],
          {
            ignoreFocusOut: true,
            title: validationResult.invalidType,
            placeHolder: "Please select the next action.",
          }
        );
        if (!selection) {
          return false;
        }
        if (selection.data === Cmd.GoogleTranslationOpenWeb) {
          // open translation website
          await Link.openGoogleTranslateWebsite({
            sourceLanguage: sourceARB.language,
            targetLanguage: validationResult.targetARB.language,
            text: sourceARB.data[validationResult.key],
            isConfirm: false,
          });
        } else {
          // text translation
          const vList = validationResultList.filter(
            (v) => v.invalidType === validationResult.invalidType
          );
          const vTotal = vList.length;
          const translationScopeAnswer = await vscode.window.showQuickPick(
            [
              {
                label: "Only selected item",
                data: false,
              },
              {
                label: `All items (${vTotal})`,
                data: true,
              },
            ],
            {
              ignoreFocusOut: true,
              title: "Retranslation Scope",
              placeHolder: `Do you want to retranslate all ${validationResult.invalidType} issues?`,
            }
          );
          if (!translationScopeAnswer) {
            return false;
          }

          if (translationScopeAnswer) {
            // translate all [validationResult.invalidType]
            let totalTranslated: number = 0;
            await vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                cancellable: true,
              },
              async (progress, token) => {
                for (const v of vList) {
                  if (token.isCancellationRequested) {
                    // cancel
                    Toast.i(`🟠 Canceled`);
                    break;
                  }

                  totalTranslated += 1;
                  await this.arbValidationRepository.retranslate(
                    v.sourceARB,
                    v.targetARB,
                    v.key
                  );
                  progress.report({
                    increment: 100 / vTotal,
                    message: `${totalTranslated} / ${vTotal} retranslated.`,
                  });
                }
              }
            );
            Toast.i(`🟢 ${vTotal} retranslated.`);
          } else {
            // retranslate only selected item
            await this.arbValidationRepository.retranslate(
              sourceARB,
              targetARB,
              key
            );
          }
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
      this.arbValidationRepository.getParamsValidation(sourceArb);
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
        this.arbValidationRepository.getParamsValidation(targetArb);

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
