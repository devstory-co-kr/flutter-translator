import path from "path";
import * as vscode from "vscode";
import {
  MetadataType,
  MetadataUrlFilesProcessingPolicy,
} from "../../metadata/metadata";
import { MetadataService } from "../../metadata/metadata.service";
import { TranslationService } from "../../translation/translation.service";
import { Toast } from "../../util/toast";
import { Cmd } from "../cmd";

interface InitParams {
  metadataService: MetadataService;
  translationService: TranslationService;
}

export class MetadataTranslateCmd {
  private metadataService: MetadataService;
  private translationService: TranslationService;

  constructor({ metadataService, translationService }: InitParams) {
    this.metadataService = metadataService;
    this.translationService = translationService;
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

    // select source metadata language
    const sourceMetadataLanguage = await this.metadataService.selectLanguage({
      languageList,
      title: "Select Source Language",
      placeHolder: `Select the source language that will be the translation source.`,
    });
    if (!sourceMetadataLanguage) {
      return;
    }

    // select target metadata languages
    const selectedMetadataLanguages =
      this.metadataService.getLanguageList(platform);
    const targetMetadataLanguages =
      await this.metadataService.selectLanguageList({
        platform,
        selectedLanguages: selectedMetadataLanguages,
        excludeLanguages: [sourceMetadataLanguage],
        title: "Select Target Languages",
        placeHolder: `Select the target languages to translate to.`,
      });
    if (targetMetadataLanguages.length === 0) {
      return;
    }

    // get source metadata
    const sourceMetadata = this.metadataService.getMetadataFile(
      platform,
      sourceMetadataLanguage
    );

    // select a list of text files to translate
    const textListToTranslate =
      await this.metadataService.selectFilesToTranslate(sourceMetadata);
    if (textListToTranslate.length === 0) {
      return;
    }

    // select url files processing policy
    const urlFilesProcessingPolicy =
      await this.metadataService.selectUrlFilesProcessingPolicy();
    if (!urlFilesProcessingPolicy) {
      return;
    }

    // select translation type
    const translationType =
      await this.translationService.selectTranslationType();
    if (!translationType) {
      return;
    }

    for (const targetMetadataLanguage of targetMetadataLanguages) {
      // get folders and files.
      const targetMetadata = this.metadataService.getMetadataFile(
        platform,
        targetMetadataLanguage
      );

      for (const sourceData of sourceMetadata.dataList) {
        const targetFilePath = path.join(
          targetMetadata.languagePath,
          sourceData.fileName
        );
        switch (sourceData.type) {
          case MetadataType.text:
            if (!textListToTranslate.includes(sourceData)) {
              continue;
            }
            // translate
            const result = await this.translationService.translate({
              type: translationType,
              queries: sourceData.text.split("\n"),
              sourceLang: sourceMetadata.language.translateLanguage,
              targetLang: targetMetadata.language.translateLanguage,
            });
            const translatedText = result.data.join("\n");
            this.metadataService.updateMetadataText(
              targetFilePath,
              translatedText
            );
            break;
          case MetadataType.url:
            if (
              urlFilesProcessingPolicy ===
              MetadataUrlFilesProcessingPolicy.override
            ) {
              this.metadataService.updateMetadataText(
                targetFilePath,
                sourceData.text
              );
            }
            break;
        }
      }
    }

    Toast.i(
      `${platform} ${targetMetadataLanguages.length} language metadata translated.`
    );
  }
}
