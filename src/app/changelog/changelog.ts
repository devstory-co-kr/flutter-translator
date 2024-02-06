import {
  MetadataLanguage,
  MetadataSupportPlatform,
} from "../metadata/metadata";

export interface Changelog {
  platform: MetadataSupportPlatform;
  language: MetadataLanguage;
  filePath: string;
  file: ChangelogFile;
}

export type ChangelogFile = {
  fileName: string;
  text: string;
  maxLength: number;
};
