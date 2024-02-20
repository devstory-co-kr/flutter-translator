import * as fs from "fs";
import { MetadataService } from "../../component/metadata/metadata.service";
import { Dialog } from "../../util/dialog";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
}

export type MetadataDeleteCmdArgs = {};

export class MetadataDeleteCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run(args?: MetadataDeleteCmdArgs) {
    // select a platform
    const platform = await this.metadataService.selectPlatform({
      placeHolder: `Select the platform to edit.`,
    });
    if (!platform) {
      return;
    }

    // select the languages to delete
    const languagesInPlatform =
      this.metadataService.getMetadataLanguagesInPlatform(platform);
    if (languagesInPlatform.length === 0) {
      Toast.i(`There is no metadata in ${platform}`);
      return;
    }
    const selectedMetadataLanguages =
      await this.metadataService.selectMetadataLanguages({
        platform,
        languages: languagesInPlatform,
        title: "Delete Metadata",
        placeHolder: "Please select the languages to delete",
      });
    // delete confirm
    const isDelete = await Dialog.showConfirmDialog({
      title: `Delete ${platform} metadata`,
      placeHolder:
        "Do you really want to delete it? No version control, no recovery",
      confirmText: "Delete",
      confirmDesc: `(${selectedMetadataLanguages.length})`,
      confirmDetail:
        platform +
        " : " +
        selectedMetadataLanguages.map((ml) => ml.locale).join(", "),
      cancelText: "Cancel",
      isReverse: true,
    });
    if (!isDelete) {
      return;
    }

    // delete
    let totalDeleted = 0;
    for (const metadataLanguage of selectedMetadataLanguages) {
      const metadata = this.metadataService.getExistMetadataFile(
        platform,
        metadataLanguage
      );
      if (!metadata) {
        continue;
      }
      if (!fs.existsSync(metadata.languagePath)) {
        continue;
      }
      Workspace.deleteDirectory(metadata.languagePath);
      totalDeleted += 1;
    }

    Toast.i(`🟢 ${platform} ${totalDeleted} metadata deleted.`);
  }
}
