import path from "path";
import { Changelog, ChangelogFile } from "../changelog";
import { MetadataLanguage, MetadataSupportPlatform } from "../metadata";

export class IOSChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.ios;
  public language: MetadataLanguage;
  public filePath: string;
  public file: ChangelogFile;

  constructor(language: MetadataLanguage, metadataPath: string) {
    const fileName = "release_notes.txt";
    this.language = language;
    this.filePath = path.join(metadataPath, language.locale, fileName);
    this.file = {
      fileName,
      text: "",
      maxLength: 4000,
    };
  }
}
