import path from "path";
import { Changelog } from "../changelog";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataText,
  MetadataType,
} from "../metadata";

export class IOSChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.ios;
  public language: MetadataLanguage;
  public filePath: string;
  public content: MetadataText;

  constructor(language: MetadataLanguage, metadataPath: string) {
    const fileName = "release_notes.txt";
    this.language = language;
    this.filePath = path.join(metadataPath, language.locale, fileName);
    this.content = {
      fileName,
      text: "",
      optional: true,
      maxLength: 4000,
      type: MetadataType.text,
    };
  }
}
