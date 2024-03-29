import path from "path";
import { Changelog, ChangelogFile } from "../../component/changelog/changelog";
import {
  MetadataLanguage,
  MetadataPlatform,
} from "../../component/metadata/metadata";

export class IosChangelog implements Changelog {
  public platform: MetadataPlatform = MetadataPlatform.ios;
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
