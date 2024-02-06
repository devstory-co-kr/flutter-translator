import { ChangelogService } from "../../component/changelog/changelog.service";
import { MetadataService } from "../../component/metadata/metadata.service";
import { Workspace } from "../../util/workspace";

interface InitParams {
  metadataService: MetadataService;
  changelogService: ChangelogService;
}

export type ChangelogOpenCmdArgs = {};

export class ChangelogOpenCmd {
  private metadataService: MetadataService;
  private changelogService: ChangelogService;
  constructor({ metadataService, changelogService }: InitParams) {
    this.metadataService = metadataService;
    this.changelogService = changelogService;
  }

  public async run(args?: ChangelogOpenCmdArgs) {
    // select platform
    const platform = await this.metadataService.selectPlatform({
      title: "Select platform to open.",
    });
    if (!platform) {
      return;
    }

    // select language
    const languageList = this.metadataService.getLanguagesInPlatform(platform);
    const language = await this.metadataService.selectLanguage({
      languageList,
      title: "Select language to open.",
    });
    if (!language) {
      return;
    }

    // select the changelog
    const buildNumber = this.changelogService.getBuildBumber();
    const changelog = this.changelogService.createChangelog({
      platform,
      buildNumber,
      language,
    });

    // open
    await Workspace.open(changelog.filePath);
  }
}
