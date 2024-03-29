import path from "path";
import { Changelog, ChangelogFile } from "../../component/changelog/changelog";
import {
  MetadataLanguage,
  MetadataPlatform,
} from "../../component/metadata/metadata";

export class AndroidChangelog implements Changelog {
  public platform: MetadataPlatform = MetadataPlatform.android;
  public language: MetadataLanguage;
  public filePath: string;
  public file: ChangelogFile;
  public buildNumber: string;

  constructor(
    buildNumber: string,
    language: MetadataLanguage,
    metadataPath: string
  ) {
    this.buildNumber = buildNumber;
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
