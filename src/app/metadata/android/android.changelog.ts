import path from "path";
import { Changelog, ChangelogFile } from "../../changelog/changelog";
import { MetadataLanguage, MetadataSupportPlatform } from "../metadata";

export class AndroidChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.android;
  public language: MetadataLanguage;
  public filePath: string;
  public file: ChangelogFile;

  constructor(
    buildNumber: string,
    language: MetadataLanguage,
    metadataPath: string
  ) {
    const fileName = `${buildNumber}.txt`;
    this.language = language;
    this.filePath = path.join(
      metadataPath,
      language.locale,
      "changelogs",
      fileName
    );
    this.file = {
      fileName,
      text: "",
      maxLength: 500,
    };
  }
}
