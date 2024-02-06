import path from "path";
import { MetadataService } from "../../component/metadata/metadata.service";
import {
  MetadataValidationItem,
  MetadataValidationType,
} from "../../component/metadata/metadata.validation";
import { Dialog } from "../../util/dialog";
import { Link } from "../../util/link";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
}

export class MetadataCheckCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run() {
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

    // show invalid metadata
    const selections = await Dialog.showSectionedPicker<
      MetadataValidationItem,
      MetadataValidationItem
    >({
      title: "Invalid Metadata List",
      canPickMany: false,
      sectionLabelList,
      itemList,
      itemBuilder: (item) => {
        return {
          section: item.sectionName,
          item: {
            label: item.data.fileName,
            detail: item.type,
            picked: false,
          },
          data: item,
        };
      },
    });
    if (!selections || selections.length === 0) {
      return;
    }

    // open document
    const validation = selections[0];
    const filePath = path.join(
      validation.metadata.languagePath,
      validation.data.fileName
    );

    const currentLength = validation.data.text.length;
    const maxLength = validation.data.maxLength ?? 0;
    const { platform, language } = validation.metadata;
    switch (validation.type) {
      case MetadataValidationType.overflow:
        await Workspace.open(filePath);
        const overflow = currentLength - maxLength;
        Toast.e(
          `Characters overflow (max: ${maxLength.toLocaleString()} / current: ${currentLength} / overflow: ${overflow.toLocaleString()})`
        );
        // open google translate website
        await Link.openGoogleTranslateWebsite({
          sourceLanguage: validation.metadata.language.translateLanguage,
          text: validation.data.text,
        });
        break;
      case MetadataValidationType.required:
        await Workspace.open(filePath);
        Toast.e(
          `${
            validation.data.fileName
          } is required (maxLength: ${maxLength.toLocaleString()})`
        );
        break;
      case MetadataValidationType.invalidURL:
        await Workspace.open(filePath);
        const message = validation.data.optional
          ? `${validation.data.fileName} can enter a URL starting with http or leave it blank.`
          : `${validation.data.fileName} must enter a URL starting with http.`;
        Toast.e(message);
        break;
      case MetadataValidationType.notExist:
        // show create files confirm
        const notExistItemList = itemList.filter(
          (item) => item.type === MetadataValidationType.notExist
        );
        if (notExistItemList.length === 1) {
          // create one
          Workspace.createPath(filePath);
          const fileName = `${platform}/${language.locale}/${validation.data.fileName}`;
          Toast.i(`${fileName} created.`);
          await Workspace.open(filePath);
          return;
        }

        const isConfirm = Dialog.showConfirmDialog({
          title: `Do you want to create all missing ${notExistItemList.length} files?`,
        });
        if (!isConfirm) {
          // canceled
          return;
        } else {
          // confirm
          for (const item of notExistItemList) {
            Workspace.createPath(
              path.join(item.metadata.languagePath, item.data.fileName)
            );
          }
          Toast.i(`${notExistItemList.length} files created.`);
          return;
        }
      case MetadataValidationType.normal:
        break;
    }
  }
}
