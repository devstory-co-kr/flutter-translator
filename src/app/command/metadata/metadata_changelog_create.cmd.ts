import { ChangelogService } from "../../metadata/changelog.service";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../../metadata/metadata";
import { MetadataService } from "../../metadata/metadata.service";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
  changelogService: ChangelogService;
}

export type MetadataChangelogCreateCmdArgs = {
  sourceMetadataLanguage?: MetadataLanguage;
};

export class MetadataChangelogCreateCmd {
  private metadataService: MetadataService;
  private changelogService: ChangelogService;

  constructor({ metadataService, changelogService }: InitParams) {
    this.metadataService = metadataService;
    this.changelogService = changelogService;
  }

  public async run(args?: MetadataChangelogCreateCmdArgs) {
    // select metadata language in android
    const platform = MetadataSupportPlatform.android;
    const language =
      args?.sourceMetadataLanguage ??
      (await this.metadataService.selectLanguage({
        languageList: this.metadataService.getLanguageListInPlatform(platform),
        title: "Select Language",
        placeHolder: "Select language to add changelog.",
      }));
    if (!language) {
      return;
    }

    // enter changelog build number
    const buildNumber = this.changelogService.getBuildBumber();
    if (!buildNumber) {
      Toast.e("Failed to get build number from pubspec.yaml.");
      return;
    }

    // create changelog
    const changelog = this.changelogService.createChangelog({
      platform,
      buildNumber,
      language,
    });

    // open changelog
    await Workspace.open(changelog.filePath);
  }
}
