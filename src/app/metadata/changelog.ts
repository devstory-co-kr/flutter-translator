import {
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataText,
} from "./metadata";

export interface Changelog {
  platform: MetadataSupportPlatform;
  language: MetadataLanguage;
  filePath: string;
  content: MetadataText;
}
