import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";
import {} from "../config/config.service";
import { Workspace } from "../util/workspace";
import { AndroidChangelog } from "./android/android.changelog";
import { Changelog } from "./changelog";
import { IOSChangelog } from "./ios/ios.changelog";
import { MetadataLanguage, MetadataSupportPlatform } from "./metadata";
import { MetadataRepository } from "./metadata.repository";

interface InitParams {
  metadataRepository: MetadataRepository;
}

export class ChangelogRepository {
  private metadataRepository: MetadataRepository;
  private getMetadataPath(platform: MetadataSupportPlatform): string {
    return this.metadataRepository.getMetadataPath(platform);
  }

  constructor({ metadataRepository }: InitParams) {
    this.metadataRepository = metadataRepository;
  }

  public createChangelog(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage,
    buildNumber: string
  ): Changelog {
    const changelog = this.getChangelog(platform, language, buildNumber);
    if (!fs.existsSync(changelog.filePath)) {
      Workspace.createPath(changelog.filePath);
    }
    return changelog;
  }

  private getChangelog(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage,
    buildNumber: string
  ): Changelog {
    switch (platform) {
      case MetadataSupportPlatform.android:
        return new AndroidChangelog(
          buildNumber,
          language,
          this.getMetadataPath(MetadataSupportPlatform.android)
        );
      case MetadataSupportPlatform.ios:
        return new IOSChangelog(
          language,
          this.getMetadataPath(MetadataSupportPlatform.android)
        );
    }
  }

  public getFlutterBuildNumber(): string | undefined {
    try {
      const pubspecPath = path.join(Workspace.getRoot(), "pubspec.yaml");
      const pubspecContent = fs.readFileSync(pubspecPath, "utf-8");
      const pubspecData: any = yaml.load(pubspecContent);
      return pubspecData.version.split("+")[1].toString();
    } catch (error) {
      return;
    }
  }
}
