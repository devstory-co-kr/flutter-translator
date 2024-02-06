import path from "path";
import {
  Metadata,
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataText,
  MetadataType,
} from "../../component/metadata/metadata";

export class AndroidMetadata implements Metadata {
  public metadataPath: string;
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.android;
  public language: MetadataLanguage;
  public get dataList(): MetadataText[] {
    return [
      this.title,
      this.shortDescription,
      this.fullDescription,
      this.video,
    ];
  }
  public get languagePath(): string {
    return path.join(this.metadataPath, this.language.locale);
  }

  constructor(language: MetadataLanguage, metadataPath: string) {
    this.language = language;
    this.metadataPath = metadataPath;
  }

  private title: MetadataText = {
    fileName: "title.txt",
    text: "",
    optional: false,
    maxLength: 30,
    type: MetadataType.text,
  };

  private fullDescription: MetadataText = {
    fileName: "full_description.txt",
    text: "",
    optional: false,
    maxLength: 4000,
    type: MetadataType.text,
  };

  private shortDescription: MetadataText = {
    fileName: "short_description.txt",
    text: "",
    optional: false,
    maxLength: 80,
    type: MetadataType.text,
  };

  private video: MetadataText = {
    fileName: "video.txt",
    text: "",
    optional: true,
    type: MetadataType.url,
  };
}
