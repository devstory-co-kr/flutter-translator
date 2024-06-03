import * as vscode from "vscode";
import { ChangelogService } from "../../component/changelog/changelog.service";

import { ConfigService } from "../../component/config/config";
import { LanguageService } from "../../component/language/language.service";
import { MetadataPlatform } from "../../component/metadata/metadata";
import { MetadataService } from "../../component/metadata/metadata.service";
import { AndroidChangelog } from "../../platform/android/android.changelog";
import { Toast } from "../../util/toast";

interface InitParams {
  metadataService: MetadataService;
  configService: ConfigService;
  languageService: LanguageService;
  changelogService: ChangelogService;
}

export type ChangelogRenameCmdArgs = {};

export class ChangelogRenameCmd {
  private configService: ConfigService;
  private metadataService: MetadataService;
  private languageService: LanguageService;
  private changelogService: ChangelogService;
  constructor({
    configService,
    metadataService,
    languageService,
    changelogService,
  }: InitParams) {
    this.configService = configService;
    this.metadataService = metadataService;
    this.languageService = languageService;
    this.changelogService = changelogService;
  }

  public async run(args?: ChangelogRenameCmdArgs) {
    // get android changelog list
    const platform = MetadataPlatform.android;
    const changelogPathList =
      await this.changelogService.getAllChangelogPathList(platform);
    const supportMetadataLangaugeList =
      this.metadataService.getMetadataLanguagesInPlatform(platform);
    const aosChangelogs = this.changelogService.getChangelogListFromPathList(
      platform,
      changelogPathList,
      supportMetadataLangaugeList
    ) as AndroidChangelog[];

    // get build number list without duplicate.
    const buildNumberList = Array.from(
      new Set(aosChangelogs.map((changelog) => changelog.buildNumber))
    ).sort((a, b) => Number(b) - Number(a));

    // select build numbers to rename
    const selection = await vscode.window.showQuickPick(
      buildNumberList.map((buildNumber) => {
        return {
          label: `${buildNumber}.txt`,
          picked: false,
          buildNumber,
        };
      }),
      {
        title: "Rename Android Changelogs",
        placeHolder: "Select Android build number to rename",
        canPickMany: false,
        ignoreFocusOut: true,
      }
    );
    if (!selection) {
      return;
    }

    console.log(selection);
    const selectedBuildNumber = selection.buildNumber;

    // target changelogs
    const targetChangelogs = aosChangelogs.filter(
      (changelog) => changelog.buildNumber === selectedBuildNumber
    );
    console.log(targetChangelogs);

    // input rename build number
    const newBuildNumber = await vscode.window.showInputBox({
      value: "",
      title: "New build number",
      ignoreFocusOut: true,
      placeHolder: "Please enter the buildNumber you want to change.",
      validateInput: (value) => {
        if (selectedBuildNumber === value || !value) {
          return "new buildNumber required";
        } else if (!/^[1-9]\d*$/.test(value)) {
          return "Please enter only positive integers.";
        }
      },
    });
    if (!newBuildNumber) {
      return;
    }

    // rename
    const newFileName = `${newBuildNumber}.txt`;
    await this.changelogService.renameChangelogs(targetChangelogs, newFileName);
    Toast.i(
      `🟢 ${targetChangelogs.length} changelogs renamed to ${newFileName}.`
    );
  }
}
