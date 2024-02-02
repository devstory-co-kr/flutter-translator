import path from "path";
import { Arb } from "../../../arb/arb";
import { ArbService } from "../../../arb/arb.service";
import {
  InvalidType,
  ValidationResult,
} from "../../../arb_validation/arb_validation";
import { ArbValidationService } from "../../../arb_validation/arb_validation.service";
import { ConfigService } from "../../../config/config.service";
import { Language } from "../../../language/language";
import { LanguageService } from "../../../language/language.service";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbValidationService: ArbValidationService;
  languageService: LanguageService;
  configService: ConfigService;
  arbService: ArbService;
}

export class ArbValidateTranslationCmd {
  private arbValidationService: ArbValidationService;
  private languageService: LanguageService;
  private configService: ConfigService;
  private arbService: ArbService;
  constructor({
    arbValidationService,
    languageService,
    configService,
    arbService,
  }: InitParams) {
    this.arbValidationService = arbValidationService;
    this.languageService = languageService;
    this.configService = configService;
    this.arbService = arbService;
  }

  public async run() {
    // load source arb
    const {
      sourceArbFilePath,
      targetLanguageCodeList,
      validateLanguageCodeList,
    } = this.configService.config;
    const sourceArb: Arb = await this.arbService.getArb(sourceArbFilePath);

    // list of languages for whitch to run validation
    const validateLanguages: Language[] = (
      validateLanguageCodeList ?? targetLanguageCodeList
    ).map((languageCode) => {
      return this.languageService.getLanguageByLanguageCode(languageCode);
    });

    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceArb,
        validateLanguages
      );
    if (validationResultList.length === 0) {
      return Toast.i("🟢 The translation has been successfully completed.");
    }

    const validationResult = await this.selectValidationResult(
      validationResultList
    );
    if (!validationResult) {
      return;
    }

    await this.arbValidationService.validate(validationResult);
  }

  private async selectValidationResult(
    validationResultList: ValidationResult[]
  ): Promise<ValidationResult | undefined> {
    const sectionMap = {
      [InvalidType.keyNotFound]: `${InvalidType.keyNotFound}`,
      [InvalidType.invalidParameters]: `${InvalidType.invalidParameters}`,
      [InvalidType.invalidParentheses]: `${InvalidType.invalidParentheses}`,
      [InvalidType.undecodedHtmlEntityExists]: `${InvalidType.undecodedHtmlEntityExists}`,
    };
    const selectItem = await Dialog.showSectionedPicker<
      ValidationResult,
      ValidationResult
    >({
      sectionLabelList: Object.values(sectionMap),
      itemList: validationResultList,
      canPickMany: false,
      itemBuilder: (validationResult) => {
        const targetFileName = path.basename(
          validationResult.targetArb.filePath
        );
        const label = targetFileName;
        const detail = `${validationResult.invalidType}`;
        const description = validationResult.key;
        return {
          section: sectionMap[validationResult.invalidType],
          item: {
            label,
            detail,
            description,
          },
          data: validationResult,
        };
      },
    });
    if (!selectItem) {
      return selectItem;
    }
    return selectItem[0];
  }
}
