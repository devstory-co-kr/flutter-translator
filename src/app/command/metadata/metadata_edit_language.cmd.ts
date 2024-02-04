import path from "path";
import * as vscode from "vscode";
import { MetadataService } from "../../metadata/metadata.service";

interface InitParams {
  metadataService: MetadataService;
}

export class MetadataEditLanguageCmd {
  private metadataService: MetadataService;

  constructor({ metadataService }: InitParams) {
    this.metadataService = metadataService;
  }

  public async run() {
    // select a platform.
    const platform = await this.metadataService.selectPlatform({});
    if (!platform) {
      return;
    }

    // select a language.
    const language = await this.metadataService.selectLanguage({
      platform,
    });
    if (!language) {
      return;
    }

    // create folders and files.
    const metadata = this.metadataService.createMetadataFiles(
      platform,
      language
    );

    // show metadata input box.
    const updatedMetadata = await this.metadataService.showMetadataInputBox(
      metadata
    );
    if (!updatedMetadata) {
      return;
    }

    // update metadata
    const savedMetadata = this.metadataService.saveMetadata(updatedMetadata);
    const savedMetadataPath = path.join(
      savedMetadata.metadataPath,
      savedMetadata.language.locale
    );

    const answer = await vscode.window.showInformationMessage(
      `${platform} ${language.name} metadata created : ${savedMetadataPath}`,
      "Open"
    );
    if (answer === "Open") {
      // focus language directory
      await vscode.commands.executeCommand(
        "revealInExplorer",
        vscode.Uri.file(savedMetadataPath)
      );
    }
  }
}
