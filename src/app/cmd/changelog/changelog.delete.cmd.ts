import * as vscode from "vscode";
import { ChangelogService } from "../../component/changelog/changelog.service";

import { ConfigService } from "../../component/config/config";
import { LanguageService } from "../../component/language/language.service";
import { MetadataPlatform } from "../../component/metadata/metadata";
import { MetadataService } from "../../component/metadata/metadata.service";
import { AndroidChangelog } from "../../platform/android/android.changelog";
import { Dialog } from "../../util/dialog";
import { Toast } from "../../util/toast";

interface InitParams {
  metadataService: MetadataService;
  configService: ConfigService;
  languageService: LanguageService;
  changelogService: ChangelogService;
}

export type ChangelogDeleteCmdArgs = {};

export class ChangelogDeleteCmd {
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

  public async run(args?: ChangelogDeleteCmdArgs) {
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

    // select build numbers to delete
    const selections =
      (await vscode.window.showQuickPick(
        buildNumberList.map((buildNumber) => {
          return {
            label: `${buildNumber}.txt`,
            picked: false,
            buildNumber,
          };
        }),
        {
          title: "Delete Android Changelogs",
          placeHolder: "Select Android build number to delete",
          canPickMany: true,
          ignoreFocusOut: true,
        }
      )) ?? [];
    if (selections.length === 0) {
      return;
    }
    const selectedBuildNumber = selections.map(
      (selection) => selection.buildNumber
    );

    // delete changelogs
    const targetChangelogs = aosChangelogs.filter((changelog) =>
      selectedBuildNumber.includes(changelog.buildNumber)
    );

    // delete confirm
    const locales = Array.from(
      new Set(targetChangelogs.map((changelog) => changelog.language.locale))
    );
    const confirmedDeleteChangelogs = await Dialog.showSectionedPicker<
      AndroidChangelog,
      AndroidChangelog
    >({
      canPickMany: true,
      sectionLabelList: locales,
      itemList: targetChangelogs,
      itemBuilder: (changelog) => {
        return {
          section: changelog.language.locale,
          data: changelog,
          item: {
            label: `${changelog.language.locale}/${changelog.buildNumber}.txt`,
            picked: true,
            changelog,
          },
        };
      },
    });
    if (!confirmedDeleteChangelogs) {
      return;
    }
    await this.changelogService.deleteChangelogs(confirmedDeleteChangelogs);
    Toast.i(`🟢 ${confirmedDeleteChangelogs.length} changelogs deleted.`);
  }
}
