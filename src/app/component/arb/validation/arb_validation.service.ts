import * as fs from "fs";
import * as he from "he";
import path from "path";
import { Dialog } from "../../../util/dialog";
import { Link } from "../../../util/link";
import { Toast } from "../../../util/toast";
import { Language } from "../../language/language";
import { LanguageService } from "../../language/language.service";
import { ARB, ARBService } from "../arb";
import { InvalidType, ValidationResult } from "./arb_validation";
import { ARBValidationRepository } from "./arb_validation.repository";

interface InitParams {
  arbValidationRepository: ARBValidationRepository;
  languageService: LanguageService;
  arbService: ARBService;
}

export class ARBValidationService {
  private arbService: ARBService;
  private languageService: LanguageService;
  private arbValidationRepository: ARBValidationRepository;
  constructor({
    arbService,
    languageService,
    arbValidationRepository,
  }: InitParams) {
    this.arbService = arbService;
    this.languageService = languageService;
    this.arbValidationRepository = arbValidationRepository;
  }

  public async getValidationResultList(
    sourceArb: ARB,
    validateLanguages: Language[]
  ): Promise<ValidationResult[]> {
    const generator = await this.generateValidationResult(
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
    const { sourceArb, targetArb, invalidType, key } = validationResult;
    const targetFileName = path.basename(targetArb.filePath);
    // toast
    Toast.i(`${targetFileName} : ${invalidType}.`);

    // highlight
    await this.arbValidationRepository.highlight(
      sourceArb,
      validationResult.targetArb,
      validationResult.key
    );

    switch (validationResult.invalidType) {
      case InvalidType.keyNotFound:
      case InvalidType.invalidParameters:
      case InvalidType.invalidParentheses:
        // open translation website
        await Link.openGoogleTranslateWebsite({
          sourceLanguage: sourceArb.language,
          targetLanguage: validationResult.targetArb.language,
          text: sourceArb.data[validationResult.key],
        });
        break;
      case InvalidType.undecodedHtmlEntityExists:
        // decode html entity
        const isDecode = await Dialog.showConfirmDialog({
          title: "Do you want to decode HTML entities?",
        });
        if (isDecode) {
          this.decodeHtmlEntities(targetArb, [key]);
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
    await this.arbService.upsert(targetArb.filePath, decodedData);
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
        sourceArb,
        sourceValidation,
        targetArb,
        targetValidation
      );
    }
  }
}
