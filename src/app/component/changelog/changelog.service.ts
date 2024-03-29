import { MetadataLanguage, MetadataPlatform } from "../metadata/metadata";
import { Changelog } from "./changelog";
import { ChangelogRepository } from "./changelog.repositoroy";
import {
  ChangelogValidation,
  ChangelogValidationType,
} from "./changelog.validation";

interface InitParams {
  changelogRepository: ChangelogRepository;
}

export class ChangelogService {
  private changelogRepository: ChangelogRepository;

  constructor({ changelogRepository }: InitParams) {
    this.changelogRepository = changelogRepository;
  }

  public createChangelog({
    platform,
    language,
    buildNumber,
  }: {
    platform: MetadataPlatform;
    language: MetadataLanguage;
    buildNumber: string;
  }): Changelog {
    return this.changelogRepository.createChangelog(
      platform,
      language,
      buildNumber
    );
  }

  public getChangelog({
    platform,
    language,
    buildNumber,
  }: {
    platform: MetadataPlatform;
    language: MetadataLanguage;
    buildNumber: string;
  }): Changelog {
    return this.changelogRepository.getChangelog(
      platform,
      language,
      buildNumber
    );
  }

  public getAllChangelogPathList(
    platform: MetadataPlatform
  ): Promise<string[]> {
    return this.changelogRepository.getAllChangelogPathList(platform);
  }

  public updateChangelog(changelog: Changelog): void {
    return this.changelogRepository.updateChangelog(changelog);
  }

  public getBuildBumber(): string {
    return this.changelogRepository.getFlutterBuildNumber();
  }

  public getInvalidList(): ChangelogValidation[] {
    const buildNumber = this.getBuildBumber();
    const changelogList =
      this.changelogRepository.getAllChangelogsByBuildNumber(buildNumber);
    return changelogList
      .map((changelog) => this.changelogRepository.check(changelog))
      .filter(
        (validation) =>
          validation.validationType !== ChangelogValidationType.normal
      );
  }

  public getChangelogListFromPathList(
    platform: MetadataPlatform,
    changelogPathList: string[],
    supportMetadataLanguageList: MetadataLanguage[]
  ): Changelog[] {
    return this.changelogRepository.getChangelogListFromPathList(
      platform,
      changelogPathList,
      supportMetadataLanguageList
    );
  }

  public deleteChangelogs(changelogs: Changelog[]): Promise<void[]> {
    return this.changelogRepository.deleteChangelogs(changelogs);
  }
}
