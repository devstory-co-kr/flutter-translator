import { CustomARBFileName, Language } from "../language/language";
import { XcodeProjectName } from "../xcode/xcode";

export type LanguageCode = string;
export type GoogleAPIKey = string;
export type ARBFileName = string;
export type FilePath = string;
export type MetadataLocale = string;

export type ARBConfig = {
  sourcePath: FilePath;
  exclude: LanguageCode[];
  prefix?: string | undefined;
  custom: Record<LanguageCode, ARBFileName>;
};

export type GoogleAuthConfig = {
  apiKey: GoogleAPIKey;
  credential: FilePath;
};

export type GoogleSheetConfig = {
  id: string;
  name: string;
  exclude: LanguageCode[];
};

export type TranslationConfig = {
  exclude: string[];
};

export type XcodeConfig = {
  projectLanguageCode: Record<XcodeProjectName, LanguageCode>;
};

export type MetadataConfig = {
  exclude: MetadataLocale[];
};

export type ChangelogConfig = {
  exclude: MetadataLocale[];
};

export type Config = {
  arbConfig: ARBConfig;
  googleAuthConfig: GoogleAuthConfig;
  googleSheetConfig: GoogleSheetConfig;
  metadataConfig: MetadataConfig;
  changelogConfig: ChangelogConfig;
  xcodeConfig: XcodeConfig;
  translationConfig: TranslationConfig;
};

export interface ConfigDataSourceI {
  getConfig(): Partial<Config>;
  setConfig(config: Partial<Config>): Thenable<void>;
}

export interface ConfigRepositoryI {
  getARBConfig(): ARBConfig;
  setARBConfig(arbConfig: Partial<ARBConfig>): Thenable<void>;

  getGoogleAuthConfig(): GoogleAuthConfig;
  setGoogleAuthConfig(
    googleAuthConfig: Partial<GoogleAuthConfig>
  ): Thenable<void>;

  getGoogleSheetConfig(): GoogleSheetConfig;
  setGoogleSheetConfig(
    googleSheetConfig: Partial<GoogleSheetConfig>
  ): Thenable<void>;

  getMetadataConfig(): MetadataConfig;
  getChangelogConfig(): ChangelogConfig;

  getXcodeConfig(): XcodeConfig;
  setXcodeConfig(xcodeConfig: Partial<XcodeConfig>): Thenable<void>;

  getTranslationConfig(): TranslationConfig;
  setTranslationConfig(
    translationConfig: Partial<TranslationConfig>
  ): Thenable<void>;
}

export interface ConfigService {
  getSourceARBPath(): Promise<string>;
  getCustomARBFileName(): Promise<CustomARBFileName>;
  getARBPrefix(): Promise<string | undefined>;
  getARBExcludeLanguageCodeList(): LanguageCode[];
  setARBCustom(custom: Record<LanguageCode, ARBFileName>): Promise<void>;
  getGoogleAuthCredential(): Promise<FilePath>;
  getGoogleAuthAPIKey(): Promise<GoogleAPIKey>;
  getMetadataExcludeLocaleList(): MetadataLocale[];
  getChangelogExcludeLocaleList(): MetadataLocale[];
  getCustomXcodeProjectLanguageCode(): Record<XcodeProjectName, LanguageCode>;
  setCustomXcodeProjectLanguage(
    projectName: XcodeProjectName
  ): Promise<Language | undefined>;
  getTranslationExclude(): string[];
  setTranslationExclude(exclude: string[]): Promise<void>;
}
