import { MetadataService } from "../../component/metadata/metadata.service";
import {
  MetadataValidationItem,
  MetadataValidationType,
} from "../../component/metadata/metadata.validation";
import { Toast } from "../../util/toast";

interface InitParams {
  metadataService: MetadataService;
}

export type MetadataCheckCmdArgs = {};

export class MetadataCheckCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run(args?: MetadataCheckCmdArgs) {
    // get validation results
    const results = this.metadataService.checkAll();
    const sectionLabelList: string[] = [];
    const itemList: MetadataValidationItem[] = [];
    for (const result of results) {
      const invalidList: MetadataValidationItem[] = [];
      for (const validation of result.validationList) {
        if (validation.type === MetadataValidationType.normal) {
          continue;
        }
        invalidList.push({
          metadata: result.metadata,
          sectionName: result.sectionName,
          ...validation,
        });
      }
      if (invalidList.length > 0) {
        sectionLabelList.push(result.sectionName);
        itemList.push(...invalidList);
      }
    }

    if (itemList.length === 0) {
      Toast.i("🟢 There is no problem with metadata.");
      return;
    }

    // select invalid metadata
    const validation = await this.metadataService.selectValidationItem({
      sectionLabelList,
      itemList,
    });
    if (!validation) {
      return;
    }

    // handle validation item
    await this.metadataService.handleValidationItem({
      validation,
      validationItemList: itemList,
    });
  }
}
