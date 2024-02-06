import path from "path";
import { Changelog } from "../changelog";
import { MetadataLanguage, MetadataSupportPlatform } from "../metadata";

export class IOSChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.ios;
  public language: MetadataLanguage;
  public filePath: string;
  public text: string = "";

  constructor(language: MetadataLanguage, metadataPath: string) {
    this.language = language;
    this.filePath = path.join(
      metadataPath,
      language.locale,
      "release_notes.txt"
    );
  }
}
