import path from "path";
import { ARB, ARBService } from "../../../component/arb/arb";
import {
  InvalidType,
  ValidationResult,
} from "../../../component/arb/validation/arb_validation";
import { ARBValidationService } from "../../../component/arb/validation/arb_validation.service";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbValidationService: ARBValidationService;
  arbService: ARBService;
}

export class ARBCheckCmd {
  private arbValidationService: ARBValidationService;
  private arbService: ARBService;
  constructor({ arbValidationService, arbService }: InitParams) {
    this.arbValidationService = arbValidationService;
    this.arbService = arbService;
  }

  public async run() {
    // load source arb
    const sourceARB: ARB = await this.arbService.getSourceARB();
    const targetARBLanguageList = await this.arbService.getTargetLanguageList();

    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceARB,
        targetARBLanguageList
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

    await this.arbValidationService.validate(validationResult, validationResultList);
  }

  private async selectValidationResult(
    validationResultList: ValidationResult[]
  ): Promise<ValidationResult | undefined> {
    const sectionMap = {
      [InvalidType.notExcluded]: `${InvalidType.notExcluded}`,
      [InvalidType.keyNotFound]: `${InvalidType.keyNotFound}`,
      [InvalidType.invalidLineBreaks]: `${InvalidType.invalidLineBreaks}`,
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
          validationResult.targetARB.filePath
        );
        const label = targetFileName;
        const detail = `${
          validationResult.invalidMessage ?? validationResult.invalidType
        }`;
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
