import { ChangelogService } from "../../metadata/changelog.service";
import { MetadataSupportPlatform } from "../../metadata/metadata";
import { MetadataService } from "../../metadata/metadata.service";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
  changelogService: ChangelogService;
}

export class MetadataChangelogCreateCmd {
  private metadataService: MetadataService;
  private changelogService: ChangelogService;

  constructor({ metadataService, changelogService }: InitParams) {
    this.metadataService = metadataService;
    this.changelogService = changelogService;
  }

  public async run() {
    // select metadata language in android
    const platform = MetadataSupportPlatform.android;
    const metadataLanguageList =
      this.metadataService.getLanguageListInPlatform(platform);
    const language = await this.metadataService.selectLanguage({
      languageList: metadataLanguageList,
      title: "Select Language",
      placeHolder: "Select language to add changelog.",
    });
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
