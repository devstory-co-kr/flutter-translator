import * as fs from "fs";
import * as vscode from "vscode";
import { Language } from "../../language/language";
import { ChangelogService } from "../../metadata/changelog.service";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../../metadata/metadata";
import { MetadataService } from "../../metadata/metadata.service";
import { TranslationService } from "../../translation/translation.service";
import { Dialog } from "../../util/dialog";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { Cmd } from "../cmd";

interface InitParams {
  metadataService: MetadataService;
  changelogService: ChangelogService;
  translationService: TranslationService;
}

export class MetadataChangelogTranslateCmd {
  private metadataService: MetadataService;
  private changelogService: ChangelogService;
  private translationService: TranslationService;

  constructor({
    metadataService,
    changelogService,
    translationService,
  }: InitParams) {
    this.metadataService = metadataService;
    this.changelogService = changelogService;
    this.translationService = translationService;
  }

  public async run() {
    // select source metadata language in android
    const sourcePlatform = MetadataSupportPlatform.android;
    const metadataLanguageList =
      this.metadataService.getLanguageListInPlatform(sourcePlatform);
    const sourceMetadataLanguage = await this.metadataService.selectLanguage({
      languageList: metadataLanguageList,
      title: "Select Source Language",
      placeHolder:
        "Select the source language that will be the translation source.",
    });
    if (!sourceMetadataLanguage) {
      return;
    }

    // enter changelog build number
    const buildNumber = this.changelogService.getBuildBumber();
    if (!buildNumber) {
      Toast.e("Failed to get build number from pubspec.yaml.");
      return;
    }

    // get source changelog
    const sourceChangelog = this.changelogService.getChangelog({
      platform: sourcePlatform,
      buildNumber,
      language: sourceMetadataLanguage,
    });

    // check file and text
    const changelogFileNotExist = !fs.existsSync(sourceChangelog.filePath);
    const changelogEmpty = sourceChangelog.text.length === 0;
    if (changelogFileNotExist || changelogEmpty) {
      Toast.i(`${sourceChangelog.filePath}`);
      const createChangelog = `Create Changelog`;
      const click = await vscode.window.showInformationMessage(
        "There is currently no changelog corresponding to buildNumber.",
        createChangelog
      );
      if (click === createChangelog) {
        if (changelogFileNotExist) {
          await vscode.commands.executeCommand(
            Cmd.MetadataChangelogCreate,
            sourceMetadataLanguage
          );
        } else {
          await Workspace.open(sourceChangelog.filePath);
        }
      }
      return;
    }

    // select target platform languages
    const targetPlatformLanguages: {
      platform: MetadataSupportPlatform;
      language: MetadataLanguage;
    }[] = await this.metadataService.selectPlatformLanguages({
      picked: true,
      excludePlatformLanguages: {
        [sourcePlatform]: [sourceMetadataLanguage],
        ios: [],
      },
    });
    if (targetPlatformLanguages.length === 0) {
      return;
    }

    // select translation type
    const translationType =
      await this.translationService.selectTranslationType();
    if (!translationType) {
      return;
    }

    // translate
    const total = targetPlatformLanguages.length;
    let totalTranslated: number = 0;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const targetPlatformLanguage of targetPlatformLanguages) {
          if (token.isCancellationRequested) {
            // cancel
            Toast.i(`🟠 Canceled`);
            break;
          }

          const targetMetadataLanguage = targetPlatformLanguage.language;
          const targetChangelog = this.changelogService.createChangelog({
            platform: targetPlatformLanguage.platform,
            language: targetPlatformLanguage.language,
            buildNumber,
          });
          const sourceLang: Language = sourceMetadataLanguage.translateLanguage;
          const targetLang: Language = targetMetadataLanguage.translateLanguage;
          if (sourceLang === targetLang) {
            // same language for different platforms -> paste
            targetChangelog.text = sourceChangelog.text;
          } else {
            // different language -> translate
            const result = await this.translationService.translate({
              type: translationType,
              queries: sourceChangelog.text.split("\n"),
              sourceLang,
              targetLang,
            });
            targetChangelog.text = result.data.join("\n");
          }

          // update target changelog
          this.changelogService.updateChangelog(targetChangelog);
          totalTranslated += 1;
          progress.report({
            increment: 100 / total,
            message: `${sourcePlatform}/${targetMetadataLanguage.locale} translated. (${totalTranslated} / ${total})`,
          });
        }
      }
    );

    Toast.i(`${totalTranslated} changelogs translated.`);

    // check
    const isPreceedValidation = await Dialog.showConfirmDialog({
      title: "Would you like to check the results?",
    });
    if (isPreceedValidation) {
      await vscode.commands.executeCommand(Cmd.MetadataCheck);
    }
  }
}
