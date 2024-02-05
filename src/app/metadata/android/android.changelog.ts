import path from "path";
import { Changelog } from "../changelog";
import { MetadataLanguage, MetadataSupportPlatform } from "../metadata";

export class AndroidChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.android;
  public language: MetadataLanguage;
  public filePath: string;

  constructor(
    buildNumber: string,
    language: MetadataLanguage,
    metadataPath: string
  ) {
    this.language = language;
    this.filePath = path.join(
      metadataPath,
      language.locale,
      "changelogs",
      `${buildNumber}.txt`
    );
  }
}
