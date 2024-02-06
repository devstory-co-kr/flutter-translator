import path from "path";
import { Changelog } from "../changelog";
import {
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataText,
  MetadataType,
} from "../metadata";

export class AndroidChangelog implements Changelog {
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.android;
  public language: MetadataLanguage;
  public filePath: string;
  public content: MetadataText;

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
    this.content = {
      fileName,
      text: "",
      optional: true,
      maxLength: 500,
      type: MetadataType.text,
    };
  }
}
