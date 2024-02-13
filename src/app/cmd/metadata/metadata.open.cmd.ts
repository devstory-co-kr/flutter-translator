import path from "path";
import * as vscode from "vscode";
import { MetadataService } from "../../component/metadata/metadata.service";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
}

export type MetadataOpenCmdArgs = {};

export class MetadataOpenCmd {
  private metadataService: MetadataService;
  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run(args?: MetadataOpenCmdArgs) {
    // select platform
    const platform = await this.metadataService.selectPlatform({
      title: "Select platform to open.",
    });
    if (!platform) {
      return;
    }

    // select language
    const languageList = this.metadataService.getLanguagesInPlatform(platform);
    const language = await this.metadataService.selectLanguage({
      languageList,
      title: "Select language to open.",
    });
    if (!language) {
      return;
    }

    // select the file
    const metadata = this.metadataService.getExistMetadataFile(
      platform,
      language
    );
    if (!metadata) {
      return;
    }
    const selection = await vscode.window.showQuickPick(
      metadata.dataList.map((data) => {
        return {
          label: data.fileName,
          data,
        };
      }),
      {
        title: "Select the file to open.",
        ignoreFocusOut: true,
      }
    );
    if (!selection) {
      return;
    }

    const file = selection.data;
    const filePath = path.join(
      metadata.metadataPath,
      language.locale,
      file.fileName
    );
    await Workspace.open(filePath);
  }
}
