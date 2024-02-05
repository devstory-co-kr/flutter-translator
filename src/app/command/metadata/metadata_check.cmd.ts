import path from "path";
import * as vscode from "vscode";
import { MetadataService } from "../../metadata/metadata.service";
import {
  MetadataValidationItem,
  MetadataValidationType,
} from "../../metadata/metadata.validation";
import { Dialog } from "../../util/dialog";
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
    switch (validation.type) {
      case MetadataValidationType.overflow:
        await Workspace.open(filePath);
        const overflow = currentLength - maxLength;
        Toast.e(
          `${overflow.toLocaleString()} characters overflow. (maxLength: ${maxLength.toLocaleString()})`
        );
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
        const fileName = `${validation.metadata.platform}/${validation.metadata.language.locale}/${validation.data.fileName}`;
        const answer = await vscode.window.showQuickPick([
          {
            label: `Create all missing ${notExistItemList.length} files`,
            value: "all",
          },
          {
            label: `Create only ${fileName}`,
            value: "one",
          },
        ]);
        if (!answer) {
          // canceled
          return;
        } else if (answer.value === "all") {
          // create many
          for (const item of notExistItemList) {
            Workspace.createPath(
              path.join(item.metadata.languagePath, item.data.fileName)
            );
          }
          Toast.i(`${notExistItemList.length} files created.`);
          return;
        } else {
          // create one
          Workspace.createPath(filePath);
          Toast.i(`${filePath} created.`);
          await Workspace.open(filePath);
          return;
        }
      case MetadataValidationType.normal:
        break;
    }
  }
}
