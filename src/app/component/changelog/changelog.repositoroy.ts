import * as fs from "fs";
import * as yaml from "js-yaml";
import path from "path";
import { AndroidChangelog } from "../../platform/android/android.changelog";
import { IosChangelog } from "../../platform/ios/ios.changelog";
import { InvalidBuildNumberException } from "../../util/exceptions";
import { Workspace } from "../../util/workspace";
import { MetadataLanguage, MetadataPlatform } from "../metadata/metadata";
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
  public getMetadataAbsolutePath(platform: MetadataPlatform): string {
    return this.metadataRepository.getMetadataAbsolutePath(platform);
  }

  constructor({ metadataRepository }: InitParams) {
    this.metadataRepository = metadataRepository;
  }

  public getAllChangelogsByBuildNumber(buildNumber: string): Changelog[] {
    return Object.values(MetadataPlatform)
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
    platform: MetadataPlatform,
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
    platform: MetadataPlatform,
    language: MetadataLanguage,
    buildNumber: string
  ): Changelog {
    let changelog: Changelog;
    switch (platform) {
      case MetadataPlatform.android:
        changelog = new AndroidChangelog(
          buildNumber,
          language,
          this.getMetadataAbsolutePath(platform)
        );
        break;
      case MetadataPlatform.ios:
        changelog = new IosChangelog(
          language,
          this.getMetadataAbsolutePath(platform)
        );
        break;
    }
    if (fs.existsSync(changelog.filePath)) {
      changelog.file.text = fs.readFileSync(changelog.filePath, "utf8").trim();
    }
    return changelog;
  }

  public async getAllChangelogPathList(
    platform: MetadataPlatform
  ): Promise<string[]> {
    const metadataPath =
      this.metadataRepository.getMetadataWorkspacePath(platform);
    switch (platform) {
      case MetadataPlatform.android:
        const aosChangelogPattern = path.join(
          metadataPath,
          "*/changelogs/*.txt"
        );
        return await Workspace.getFiles(aosChangelogPattern);
      case MetadataPlatform.ios:
        const iosChangelogPattern = path.join(
          metadataPath,
          "*/release_notes.txt"
        );
        return await Workspace.getFiles(iosChangelogPattern);
    }
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

  public getChangelogListFromPathList(
    platform: MetadataPlatform,
    changelogPathList: string[],
    supportMetadataLanguageList: MetadataLanguage[]
  ): Changelog[] {
    switch (platform) {
      case MetadataPlatform.android:
        const aosMetadataPath = this.getMetadataAbsolutePath(platform);
        return changelogPathList.map((changelogPath) => {
          const match = changelogPath.match(
            /\/metadata\/android\/(.*)\/changelogs\/(\d+)\.txt/
          )!;
          const changelogLocale = match[1];
          const changelogBuildNumber = match[2];
          const changelogLanguage = supportMetadataLanguageList.find(
            (metadataLanguage) => metadataLanguage.locale === changelogLocale
          )!;
          return new AndroidChangelog(
            changelogBuildNumber,
            changelogLanguage,
            aosMetadataPath
          );
        });

      case MetadataPlatform.ios:
        const iosMetadataPath = this.getMetadataAbsolutePath(platform);
        return changelogPathList.map((changelogPath) => {
          const changelogLocale = changelogPath.match(
            /\/metadata\/(.*)\/release_notes.txt/
          )![1];
          const changelogLanguage = supportMetadataLanguageList.find(
            (metadataLanguage) => metadataLanguage.locale === changelogLocale
          )!;
          return new IosChangelog(changelogLanguage, iosMetadataPath);
        });
    }
  }

  public deleteChangelogs(changelogs: Changelog[]): Promise<void[]> {
    return Promise.all(
      changelogs.map((changelog => Workspace.deleteFile(changelog.filePath)))
    );
  }
}
