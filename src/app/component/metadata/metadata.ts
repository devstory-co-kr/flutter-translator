import { Language } from "../language/language";

/**
 * Support platform
 */
export enum MetadataSupportPlatform {
  android = "android",
  ios = "ios",
}

/**
 * AOS Available Languages
 * - Google Play Store : https://support.google.com/googleplay/android-developer/answer/9844778?visit_id=638424490119108924-4187109290&rd=1#zippy=%2Cview-list-of-available-languages%2C%EC%82%AC%EC%9A%A9-%EA%B0%80%EB%8A%A5%ED%95%9C-%EC%96%B8%EC%96%B4-%EB%AA%A9%EB%A1%9D-%EB%B3%B4%EA%B8%B0
 *
 * iOS Available Languages
 * - App Store : https://developer.apple.com/help/app-store-connect/reference/app-store-localizations
 * - Fastlane deliver : https://docs.fastlane.tools/actions/deliver/#:~:text=Tips-,Available,-language%20codes
 */
export type MetadataLanguage = {
  name: string;
  locale: string;
  translateLanguage: Language;
};

export type MetadataPlatformLanguage = {
  platform: MetadataSupportPlatform;
  language: MetadataLanguage;
};

export enum MetadataUrlFilesProcessingPolicy {
  skip = "skip",
  override = "override",
}

export enum MetadataType {
  text = "text",
  url = "url",
}

export type MetadataText = {
  fileName: string;
  text: string;
  optional: boolean;
  maxLength?: number;
  type: MetadataType;
};

export interface Metadata {
  metadataPath: string;
  platform: MetadataSupportPlatform;
  language: MetadataLanguage;
  get dataList(): MetadataText[];
  get languagePath(): string;
}
