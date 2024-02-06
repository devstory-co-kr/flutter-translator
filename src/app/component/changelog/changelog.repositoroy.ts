import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";
import { AndroidChangelog } from "../../platform/android/android.changelog";
import { IOSChangelog } from "../../platform/ios/ios.changelog";
import { InvalidBuildNumberException } from "../../util/exceptions";
import { Workspace } from "../../util/workspace";
import {} from "../config/config.service";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../metadata/metadata";
import { MetadataRepository } from "../metadata/metadata.repository";
import { Changelog } from "./changelog";
import {
  ChangelogValidation,
  ChangelogValidationType,
} from "./changelog.validation";

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

  public getAllChangelog(buildNumber: string): Changelog[] {
    return Object.values(MetadataSupportPlatform)
      .map((platform) => {
        const languages =
          this.metadataRepository.getLanguagesInPlatform(platform);
        return languages
          .map((language) => this.getChangelog(platform, language, buildNumber))
          .flat();
      })
      .flat();
  }

  public createChangelog(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage,
    buildNumber: string
  ): Changelog {
    const changelog = this.getChangelog(platform, language, buildNumber);
    if (!fs.existsSync(changelog.filePath)) {
      Workspace.createPath(changelog.filePath);
    } else {
      changelog.file.text = fs.readFileSync(changelog.filePath, "utf8").trim();
    }
    return changelog;
  }

  public getChangelog(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage,
    buildNumber: string
  ): Changelog {
    let changelog: Changelog;
    switch (platform) {
      case MetadataSupportPlatform.android:
        changelog = new AndroidChangelog(
          buildNumber,
          language,
          this.getMetadataPath(platform)
        );
        break;
      case MetadataSupportPlatform.ios:
        changelog = new IOSChangelog(language, this.getMetadataPath(platform));
        break;
    }
    if (fs.existsSync(changelog.filePath)) {
      changelog.file.text = fs.readFileSync(changelog.filePath, "utf8").trim();
    }
    return changelog;
  }

  public getFlutterBuildNumber(): string {
    try {
      const pubspecPath = path.join(Workspace.getRoot(), "pubspec.yaml");
      const pubspecContent = fs.readFileSync(pubspecPath, "utf-8");
      const pubspecData: any = yaml.load(pubspecContent);
      return pubspecData.version.split("+")[1].toString();
    } catch (error) {
      throw new InvalidBuildNumberException();
    }
  }

  public updateChangelog(changelog: Changelog): void {
    if (!fs.existsSync(changelog.filePath)) {
      Workspace.createPath(changelog.filePath);
    }
    fs.writeFileSync(changelog.filePath, changelog.file.text);
  }

  public check(changelog: Changelog): ChangelogValidation {
    if (!fs.existsSync(changelog.filePath)) {
      return {
        changelog,
        validationType: ChangelogValidationType.notExist,
      };
    } else if (changelog.file.text.trim().length === 0) {
      return {
        changelog,
        validationType: ChangelogValidationType.empty,
      };
    } else if (changelog.file.text.trim().length > changelog.file.maxLength) {
      return {
        changelog,
        validationType: ChangelogValidationType.overflow,
      };
    } else {
      return {
        changelog,
        validationType: ChangelogValidationType.normal,
      };
    }
  }
}
