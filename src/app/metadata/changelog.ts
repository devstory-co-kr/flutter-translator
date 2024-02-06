import { MetadataLanguage, MetadataSupportPlatform } from "./metadata";

export interface Changelog {
  platform: MetadataSupportPlatform;
  language: MetadataLanguage;
  filePath: string;
  text: string;
}
