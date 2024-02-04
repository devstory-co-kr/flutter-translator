import {
  Metadata,
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataText,
  MetadataType,
} from "../metadata";

export class IOSMetadata implements Metadata {
  public metadataPath: string;
  public platform: MetadataSupportPlatform = MetadataSupportPlatform.ios;
  public language: MetadataLanguage;
  public get dataList(): MetadataText[] {
    return [
      this.name,
      this.subtitle,
      this.description,
      this.keywords,
      this.promotionalText,
      this.releaseNotes,
      this.supportUrl,
      this.marketingUrl,
      this.privacyUrl,
    ];
  }

  constructor(language: MetadataLanguage, metadataPath: string) {
    this.language = language;
    this.metadataPath = metadataPath;
  }
  private name: MetadataText = {
    fileName: "name.txt",
    text: "",
    optional: false,
    maxLength: 30,
    type: MetadataType.text,
  };

  private subtitle: MetadataText = {
    fileName: "subtitle.txt",
    text: "",
    optional: false,
    maxLength: 30,
    type: MetadataType.text,
  };

  private description: MetadataText = {
    fileName: "description.txt",
    text: "",
    optional: false,
    maxLength: 4000,
    type: MetadataType.text,
  };

  private keywords: MetadataText = {
    fileName: "keywords.txt",
    text: "",
    optional: false,
    maxLength: 100,
    type: MetadataType.text,
  };

  private promotionalText: MetadataText = {
    fileName: "promotional_text.txt",
    text: "",
    optional: false,
    maxLength: 170,
    type: MetadataType.text,
  };

  private releaseNotes: MetadataText = {
    fileName: "release_notes.txt",
    text: "",
    optional: false,
    maxLength: 170,
    type: MetadataType.text,
  };

  private supportUrl: MetadataText = {
    fileName: "support_url.txt",
    text: "",
    optional: false,
    type: MetadataType.url,
  };

  private marketingUrl: MetadataText = {
    fileName: "marketing_url.txt",
    text: "",
    optional: false,
    type: MetadataType.url,
  };

  private privacyUrl: MetadataText = {
    fileName: "privacy_url.txt",
    text: "",
    optional: false,
    type: MetadataType.url,
  };
}
