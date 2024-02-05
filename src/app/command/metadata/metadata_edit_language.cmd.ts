import path from "path";
import * as vscode from "vscode";
import { MetadataService } from "../../metadata/metadata.service";
import { Cmd } from "../cmd";

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
    const platform = await this.metadataService.selectPlatform({
      placeHolder: `Select the platform to edit.`,
    });
    if (!platform) {
      return;
    }

    // get list of selected platform languages
    const languageList = this.metadataService.getLanguageList(platform);
    if (languageList.length === 0) {
      const title = `There is no language to edit in ${platform}.`;
      const answer = await vscode.window.showInformationMessage(
        title,
        "Add Languages"
      );
      if (answer === "Add Languages") {
        await vscode.commands.executeCommand(Cmd.MetadataAddLanguages);
      }
      return;
    }

    // select a language.
    const language = await this.metadataService.selectLanguage({
      languageList,
      placeHolder: `Select the language to edit.`,
    });
    if (!language) {
      return;
    }

    // get folders and files.
    const metadata = this.metadataService.getMetadataFile(platform, language);

    // show metadata input box.
    const updatedMetadata = await this.metadataService.showMetadataInputBox(
      metadata
    );
    if (!updatedMetadata) {
      return;
    }

    // update metadata
    const savedMetadata = this.metadataService.updateMetadata(updatedMetadata);
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
