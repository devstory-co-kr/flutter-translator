import path from "path";
import * as vscode from "vscode";
import {
  Metadata,
  MetadataText,
  MetadataType,
  MetadataUrlFilesProcessingPolicy,
} from "../../metadata/metadata";
import { MetadataService } from "../../metadata/metadata.service";
import { TranslationType } from "../../translation/translation";
import { TranslationService } from "../../translation/translation.service";
import { Dialog } from "../../util/dialog";
import { Toast } from "../../util/toast";
import { Cmd } from "../cmd";
import { MetadataAddLanguagesCmdArgs } from "./metadata_add_languages.cmd";

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
    const languageList =
      this.metadataService.getLanguageListInPlatform(platform);
    if (languageList.length === 0) {
      const title = `There is no language to edit in ${platform}.`;
      const answer = await vscode.window.showInformationMessage(
        title,
        "Add Languages"
      );
      if (answer === "Add Languages") {
        await vscode.commands.executeCommand(Cmd.MetadataAddLanguages, <
          MetadataAddLanguagesCmdArgs
        >{
          platform,
        });
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
      this.metadataService.getLanguageListInPlatform(platform);
    const targetMetadataLanguages =
      await this.metadataService.selectLanguageListInPlatform({
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
    const sourceMetadata = this.metadataService.createMetadataFile(
      platform,
      sourceMetadataLanguage
    );

    // select a list of text files to translate
    const textListToTranslate: MetadataText[] =
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

    const total = targetMetadataLanguages.length;
    let totalTranslated = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const targetMetadataLanguage of targetMetadataLanguages) {
          if (token.isCancellationRequested) {
            // cancel
            Toast.i(`🟠 Canceled`);
            break;
          }

          // get folders and files.
          const targetMetadata = this.metadataService.createMetadataFile(
            platform,
            targetMetadataLanguage
          );
          await this.translate({
            sourceMetadata,
            targetMetadata,
            textListToTranslate,
            urlFilesProcessingPolicy,
            translationType,
          });
          totalTranslated += 1;

          progress.report({
            increment: 100 / total,
            message: `${platform}/${targetMetadataLanguage.locale} translated. (${totalTranslated} / ${total})`,
          });
        }
      }
    );

    Toast.i(`${platform} ${totalTranslated} language metadata translated.`);

    // check
    const isPreceedValidation = await Dialog.showConfirmDialog({
      title: "Would you like to check the results?",
    });
    if (isPreceedValidation) {
      await vscode.commands.executeCommand(Cmd.MetadataCheck);
    }
  }

  private async translate({
    sourceMetadata,
    targetMetadata,
    textListToTranslate,
    urlFilesProcessingPolicy,
    translationType,
  }: {
    sourceMetadata: Metadata;
    targetMetadata: Metadata;
    textListToTranslate: MetadataText[];
    urlFilesProcessingPolicy: MetadataUrlFilesProcessingPolicy;
    translationType: TranslationType;
  }): Promise<void> {
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
}
