import * as vscode from "vscode";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../../component/metadata/metadata";
import { MetadataService } from "../../component/metadata/metadata.service";
import { Toast } from "../../util/toast";

interface InitParams {
  metadataService: MetadataService;
}

export type MetadataCreateCmdArgs = {
  platform?: MetadataSupportPlatform;
  selectedMetadataLanguages?: MetadataLanguage[];
};

export class MetadataCreateCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run(args?: MetadataCreateCmdArgs) {
    // select a platform.
    const platform =
      args?.platform ??
      (await this.metadataService.selectPlatform({
        placeHolder: `Select platform to add languages.`,
      }));
    if (!platform) {
      return;
    }

    // select language list.
    const excludeLanguages =
      this.metadataService.getLanguagesInPlatform(platform);
    const languageList =
      args?.selectedMetadataLanguages ??
      (await this.metadataService.selectLanguageListInPlatform({
        platform,
        excludeLanguages: excludeLanguages,
        placeHolder: `Select languages to add.`,
      }));
    if (languageList.length === 0) {
      return;
    }

    // create folders and files.
    for (const language of languageList) {
      this.metadataService.createMetadataFile(platform, language);
    }

    await vscode.commands.executeCommand(
      "revealInExplorer",
      vscode.Uri.file(this.metadataService.getMetadataPath(platform))
    );
    Toast.i(`${platform} ${languageList.length} languages created.`);
  }
}
