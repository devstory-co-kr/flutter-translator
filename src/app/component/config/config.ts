import { CustomARBFileName } from "../language/language";

export type LanguageCode = string;
export type GoogleAPIKey = string;
export type ARBFileName = string;
export type FilePath = string;

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

export type Config = {
  arbConfig: ARBConfig;
  googleAuthConfig: GoogleAuthConfig;
  googleSheetConfig: GoogleSheetConfig;
};

export interface ConfigService {
  getSourceARBPath(): Promise<string>;
  getCustomARBFileName(): Promise<CustomARBFileName>;
  getARBPrefix(): Promise<string | undefined>;
  getARBExcludeLanguageCodeList(): LanguageCode[];
  getGoogleAuthCredential(): Promise<FilePath>;
  getGoogleAuthAPIKey(): Promise<GoogleAPIKey>;
}

export interface ConfigRepositoryI {
  getARBConfig(): ARBConfig;
  getGoogleAuthConfig(): GoogleAuthConfig;
  getGoogleSheetConfig(): GoogleSheetConfig;

  setARBConfig(arbConfig: Partial<ARBConfig>): void;
  setGoogleAuthConfig(googleAuthConfig: Partial<GoogleAuthConfig>): void;
  setGoogleSheetConfig(googleSheetConfig: Partial<GoogleSheetConfig>): void;
}

export interface ConfigDataSourceI {
  getConfig(): Partial<Config>;
  setConfig(config: Config): void;
}
