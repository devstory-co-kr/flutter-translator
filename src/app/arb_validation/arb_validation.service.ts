import * as fs from "fs";
import * as he from "he";
import path from "path";
import { Arb } from "../arb/arb";
import { ArbService } from "../arb/arb.service";
import { Language } from "../language/language";
import { LanguageService } from "../language/language.service";
import { TranslationService } from "../translation/translation.service";
import { Dialog } from "../util/dialog";
import { Link } from "../util/link";
import { Toast } from "../util/toast";
import { InvalidType, ValidationResult } from "./arb_validation";
import { ArbValidationRepository } from "./arb_validation.repository";

interface InitParams {
  arbValidationRepository: ArbValidationRepository;
  translationService: TranslationService;
  languageService: LanguageService;
  arbService: ArbService;
}

export class ArbValidationService {
  private arbService: ArbService;
  private languageService: LanguageService;
  private translationService: TranslationService;
  private arbValidationRepository: ArbValidationRepository;
  constructor({
    arbService,
    languageService,
    translationService,
    arbValidationRepository,
  }: InitParams) {
    this.arbService = arbService;
    this.languageService = languageService;
    this.translationService = translationService;
    this.arbValidationRepository = arbValidationRepository;
  }

  public async getValidationResultList(
    sourceArb: Arb,
    targetLanguages: Language[]
  ): Promise<ValidationResult[]> {
    const generator = await this.generateValidationResult(
      sourceArb,
      targetLanguages
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
        await this.openTranslationWebsite(
          sourceArb.language,
          validationResult.targetArb.language,
          sourceArb.data[validationResult.key]
        );
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

  public async decodeHtmlEntities(targetArb: Arb, keyList: string[]) {
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
    sourceArb: Arb,
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
        this.languageService.getArbFilePathFromLanguageCode(
          targetLanguage.languageCode
        );
      if (!fs.existsSync(targetArbFilePath)) {
        continue;
      }

      // get targetArb
      const targetArb: Arb = await this.arbService.getArb(targetArbFilePath);
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

  private async openTranslationWebsite(
    sourceLanguage: Language,
    targetLanguage: Language,
    text: string
  ) {
    const isShow = await Dialog.showConfirmDialog({
      title: "Do you want to open the Google Translate website?",
    });
    if (!isShow) {
      return;
    }

    const url = this.translationService.getTranslateWebsiteUrl(
      sourceLanguage,
      targetLanguage,
      text
    );
    Link.show(url);
  }
}
