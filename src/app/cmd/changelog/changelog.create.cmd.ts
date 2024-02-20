import { ChangelogService } from "../../component/changelog/changelog.service";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../../component/metadata/metadata";
import { MetadataService } from "../../component/metadata/metadata.service";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
  changelogService: ChangelogService;
}

export type ChangelogCreateCmdArgs = {
  sourceMetadataLanguage?: MetadataLanguage;
};

export class ChangelogCreateCmd {
  private metadataService: MetadataService;
  private changelogService: ChangelogService;

  constructor({ metadataService, changelogService }: InitParams) {
    this.metadataService = metadataService;
    this.changelogService = changelogService;
  }

  public async run(args?: ChangelogCreateCmdArgs) {
    // select metadata language in android
    const platform = MetadataSupportPlatform.android;
    const language =
      args?.sourceMetadataLanguage ??
      (await this.metadataService.selectLanguage({
        languageList:
          this.metadataService.getMetadataLanguagesInPlatform(platform),
        title: "Select Language",
        placeHolder: "Select language to add changelog.",
      }));
    if (!language) {
      return;
    }

    // enter changelog build number
    const buildNumber = this.changelogService.getBuildBumber();

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
