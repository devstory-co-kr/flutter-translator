import * as fs from "fs";
import * as vscode from "vscode";
import { ChangelogService } from "../../component/changelog/changelog.service";
import { ConfigService } from "../../component/config/config";
import { Language } from "../../component/language/language";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../../component/metadata/metadata";
import { MetadataService } from "../../component/metadata/metadata.service";
import { TranslationService } from "../../component/translation/translation.service";
import { Dialog } from "../../util/dialog";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { Cmd } from "../cmd";
import { ChangelogCreateCmdArgs } from "./changelog.create.cmd";

interface InitParams {
  configService: ConfigService;
  metadataService: MetadataService;
  changelogService: ChangelogService;
  translationService: TranslationService;
}

export type ChangelogTranslateCmdArgs = {
  sourceMetadataLanguage?: MetadataLanguage;
  targetPlatformLanguages?: {
    platform: MetadataSupportPlatform;
    language: MetadataLanguage;
  }[];
};

export class ChangelogTranslateCmd {
  private configService: ConfigService;
  private metadataService: MetadataService;
  private changelogService: ChangelogService;
  private translationService: TranslationService;

  constructor({
    configService,
    metadataService,
    changelogService,
    translationService,
  }: InitParams) {
    this.configService = configService;
    this.metadataService = metadataService;
    this.changelogService = changelogService;
    this.translationService = translationService;
  }

  public async run(args?: ChangelogTranslateCmdArgs) {
    // select source metadata language in android
    const sourcePlatform = MetadataSupportPlatform.android;
    const metadataLanguageList =
      this.metadataService.getMetadataLanguagesInPlatform(sourcePlatform);
    const sourceMetadataLanguage =
      args?.sourceMetadataLanguage ??
      (await this.metadataService.selectLanguage({
        languageList: metadataLanguageList,
        title: "Select Source Language",
        placeHolder:
          "Select the source language that will be the translation source.",
      }));
    if (!sourceMetadataLanguage) {
      return;
    }

    // enter changelog build number
    const buildNumber = this.changelogService.getBuildBumber();

    // get source changelog
    const sourceChangelog = this.changelogService.getChangelog({
      platform: sourcePlatform,
      buildNumber,
      language: sourceMetadataLanguage,
    });

    // check file and text
    const changelogFileNotExist = !fs.existsSync(sourceChangelog.filePath);
    const changelogEmpty = sourceChangelog.file.text.length === 0;
    if (changelogFileNotExist || changelogEmpty) {
      Toast.i(`${sourceChangelog.filePath}`);
      const createChangelog = `Create Changelog`;
      const click = await vscode.window.showInformationMessage(
        `There is currently no changelog corresponding to buildNumber(${buildNumber}).`,
        createChangelog
      );
      if (click === createChangelog) {
        if (changelogFileNotExist) {
          await vscode.commands.executeCommand(Cmd.ChangelogCreate, <
            ChangelogCreateCmdArgs
          >{
            sourceMetadataLanguage,
          });
        } else {
          await Workspace.open(sourceChangelog.filePath);
        }
      }
      return;
    }

    // select target platform languages
    const changelogExcludeLocales =
      this.configService.getChangelogExcludeLocaleList();
    const targetPlatformLanguages: {
      platform: MetadataSupportPlatform;
      language: MetadataLanguage;
    }[] =
      args?.targetPlatformLanguages ??
      (await this.metadataService.selectPlatformLanguages({
        itemListFilter: (platformLanguages) => {
          return platformLanguages.filter((pl) => {
            return !changelogExcludeLocales.includes(pl.language.locale);
          });
        },
        picked: true,
        excludePlatformLanguages: {
          [sourcePlatform]: [sourceMetadataLanguage],
          ios: [],
        },
      }));
    if (targetPlatformLanguages.length === 0) {
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
            targetChangelog.file = sourceChangelog.file;
          } else {
            // different language -> translate
            const result = await this.translationService.translate({
              queries: sourceChangelog.file.text.split("\n"),
              sourceLang,
              targetLang,
            });
            targetChangelog.file.text = result.data.join("\n");
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
      await vscode.commands.executeCommand(Cmd.ChangelogCheck);
    }
  }
}
