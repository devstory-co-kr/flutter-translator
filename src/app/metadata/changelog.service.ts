import { Changelog } from "./changelog";
import { ChangelogRepository } from "./changelog.repositoroy";
import { MetadataLanguage, MetadataSupportPlatform } from "./metadata";

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
    platform: MetadataSupportPlatform;
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
    platform: MetadataSupportPlatform;
    language: MetadataLanguage;
    buildNumber: string;
  }): Changelog {
    return this.changelogRepository.getChangelog(
      platform,
      language,
      buildNumber
    );
  }

  public updateChangelog(changelog: Changelog): void {
    return this.changelogRepository.updateChangelog(changelog);
  }

  public getBuildBumber(): string | undefined {
    return this.changelogRepository.getFlutterBuildNumber();
  }
}
