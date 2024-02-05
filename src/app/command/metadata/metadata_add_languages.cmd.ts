import * as vscode from "vscode";
import { MetadataService } from "../../metadata/metadata.service";
import { Toast } from "../../util/toast";

interface InitParams {
  metadataService: MetadataService;
}

export class MetadataAddLanguagesCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run() {
    // select a platform.
    const platform = await this.metadataService.selectPlatform({
      placeHolder: `Select platform to add languages.`,
    });
    if (!platform) {
      return;
    }

    // select language list.
    const selectedLanguages = this.metadataService.getLanguageList(platform);
    const languageList = await this.metadataService.selectLanguageList({
      platform,
      selectedLanguages,
      placeHolder: `Select languages to add.`,
    });
    if (languageList.length === 0) {
      return;
    }

    // create folders and files.
    for (const language of languageList) {
      this.metadataService.getMetadataFile(platform, language);
    }

    await vscode.commands.executeCommand(
      "revealInExplorer",
      vscode.Uri.file(this.metadataService.getMetadataPath(platform))
    );
    Toast.i(`${platform} ${languageList.length} languages created.`);
  }
}
