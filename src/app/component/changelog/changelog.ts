import { MetadataLanguage, MetadataPlatform } from "../metadata/metadata";

export interface Changelog {
  platform: MetadataPlatform;
  language: MetadataLanguage;
  filePath: string;
  file: ChangelogFile;
}

export type ChangelogFile = {
  fileName: string;
  text: string;
  maxLength: number;
};
