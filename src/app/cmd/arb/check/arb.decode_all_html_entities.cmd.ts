import { Arb } from "../../../component/arb/arb";
import { ArbService } from "../../../component/arb/arb.service";
import {
  InvalidType,
  ValidationResult,
} from "../../../component/arb/validation/arb_validation";
import { ArbValidationService } from "../../../component/arb/validation/arb_validation.service";
import { ConfigService } from "../../../component/config/config.service";
import { Language } from "../../../component/language/language";
import { LanguageService } from "../../../component/language/language.service";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbValidationService: ArbValidationService;
  languageService: LanguageService;
  configService: ConfigService;
  arbService: ArbService;
}

export class ArbDecodeAllHtmlEntitiesCmd {
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

  async run() {
    // load source arb
    const sourceArb: Arb = await this.arbService.getArb(
      this.configService.config.sourceArbFilePath
    );

    // list of languages to be translated
    const targetLanguages: Language[] =
      this.configService.config.targetLanguageCodeList.map((languageCode) => {
        return this.languageService.getLanguageByLanguageCode(languageCode);
      });

    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceArb,
        targetLanguages
      );
    const undecodedHtmlEntities: {
      [filePath: string]: ValidationResult[];
    } = {};

    let total = 0;
    for (const validationResult of validationResultList) {
      if (
        validationResult.invalidType === InvalidType.undecodedHtmlEntityExists
      ) {
        total += 1;
        undecodedHtmlEntities[validationResult.targetArb.filePath] = [
          ...(undecodedHtmlEntities[validationResult.targetArb.filePath] ?? []),
          validationResult,
        ];
      }
    }

    const keys: string[] = Object.keys(undecodedHtmlEntities);
    if (keys.length === 0) {
      return Toast.i("🟢 No undecoded HTML entities.");
    }

    const isDecode = await Dialog.showConfirmDialog({
      title: `Do you want to decode all ${total} undecoded HTML entities?`,
      confirmText: "Decode",
    });
    if (isDecode) {
      for (const key of keys) {
        const keysByFile = undecodedHtmlEntities[key].map(
          (validationResult) => validationResult.key
        );
        const targetArb = undecodedHtmlEntities[key][0].targetArb;
        await this.arbValidationService.decodeHtmlEntities(
          targetArb,
          keysByFile
        );
      }
      return Toast.i(`🟢 Finished decoding ${total} HTML entities.`);
    }
  }
}
