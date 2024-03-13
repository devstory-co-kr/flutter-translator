import { ARB, ARBService } from "../../../component/arb/arb";
import {
  InvalidType,
  ValidationResult,
} from "../../../component/arb/validation/arb_validation";
import { ARBValidationService } from "../../../component/arb/validation/arb_validation.service";
import { Language } from "../../../component/language/language";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbValidationService: ARBValidationService;
  arbService: ARBService;
}

export class ARBDecodeAllHtmlEntitiesCmd {
  private arbValidationService: ARBValidationService;
  private arbService: ARBService;
  constructor({ arbValidationService, arbService }: InitParams) {
    this.arbValidationService = arbValidationService;
    this.arbService = arbService;
  }

  async run() {
    // load source arb
    const sourceArb: ARB = await this.arbService.getSourceARB();

    // list of languages to be translated
    const targetLanguageList: Language[] =
      await this.arbService.getTargetLanguageList();

    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceArb,
        targetLanguageList
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
        undecodedHtmlEntities[validationResult.targetARB.filePath] = [
          ...(undecodedHtmlEntities[validationResult.targetARB.filePath] ?? []),
          validationResult,
        ];
      }
    }

    const keys: string[] = Object.keys(undecodedHtmlEntities);
    if (keys.length === 0) {
      return Toast.i("🟢 No undecoded HTML entities.");
    }

    const isDecode = await Dialog.showConfirmDialog({
      title: "Decode HTML Entities",
      placeHolder: `Do you want to decode all ${total} undecoded HTML entities?`,
      confirmText: "Decode",
    });
    if (isDecode) {
      for (const key of keys) {
        const keysByFile = undecodedHtmlEntities[key].map(
          (validationResult) => validationResult.key
        );
        const targetArb = undecodedHtmlEntities[key][0].targetARB;
        await this.arbValidationService.decodeHtmlEntities(
          targetArb,
          keysByFile
        );
      }
      return Toast.i(`🟢 Finished decoding ${total} HTML entities.`);
    }
  }
}
