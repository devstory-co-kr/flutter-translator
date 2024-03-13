import * as fs from "fs";
import * as he from "he";
import path from "path";
import * as vscode from "vscode";
import { Cmd } from "../../../cmd/cmd";
import { TextTranslateCmdArgs } from "../../../cmd/translation/text.translate.cmd";
import { Dialog } from "../../../util/dialog";
import { Editor } from "../../../util/editor";
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

  public async validate(validationResult: ValidationResult): Promise<boolean> {
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
              label: "Translate again without cache.",
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
          const { editor: targetEditor } = await Editor.open(
            targetARB.filePath,
            vscode.ViewColumn.Two
          );
          const selection = Editor.selectFromARB(
            targetEditor,
            key,
            `${targetARB.data[key]}`
          );
          // Set newline character (\n) to be displayed as \n when translated
          const query = sourceARB.data[key].replace(/\n/g, "\\n");
          await vscode.commands.executeCommand(Cmd.TextTranslate, <
            TextTranslateCmdArgs
          >{
            queries: [query],
            selections: [selection],
            sourceLang: sourceARB.language,
            targetLang: targetARB.language,
            useCache: false,
          });
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
