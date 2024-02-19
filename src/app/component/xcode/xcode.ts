import { FilePath } from "../config/config";
import { Language } from "../language/language";

export enum XcodePlatform {
  ios = "ios",
  macos = "macos",
}
export type XcodeTarget = string;

// end with .lproj
export const XcodeProjectDirectoryExt = ".lproj";
export type XcodeProjectName = string;

export type XcodeProject = {
  language: XcodeLanguage;
  name: XcodeProjectName;
  filePath: FilePath;
  stringsFilePathList: FilePath[];
};

export type XcodeUnknownProject = {
  language?: XcodeLanguage;
  name: XcodeProjectName;
  filePath: FilePath;
  stringsFilePathList: FilePath[];
};

export type XcodeLanguage = {
  name: string;
  locale: string;
  translateLanguage: Language;
};

export interface XcodeService {
  getPlatforms(): XcodePlatform[];
  selectPlatform(
    platforms: XcodePlatform[]
  ): Promise<XcodePlatform | undefined>;

  getTargets(platform: XcodePlatform): XcodeTarget[];
  selectTargets(target: XcodeTarget[]): Promise<XcodeTarget | undefined>;

  getProjects({
    platform,
    target,
  }: {
    platform: XcodePlatform;
    target: XcodeTarget;
  }): {
    projects: XcodeProject[];
    unknownProjects: XcodeUnknownProject[];
  };

  selectUnknownProjectLanguage(
    unknownProject: XcodeUnknownProject
  ): Promise<XcodeLanguage | undefined>;

  getStringsData(stringsFilePath: FilePath): Record<string, string>;
  setStringsData(stringsFilePath: FilePath, data: Record<string, string>): void;
}

export interface XcodeRepository {
  getPlatformPath(platform: XcodePlatform): FilePath;
  getTargetPathList(platform: XcodePlatform): FilePath[];
  getProjects({
    platform,
    target,
  }: {
    platform: XcodePlatform;
    target: XcodeTarget;
  }): {
    projects: XcodeProject[];
    unknownProjects: XcodeUnknownProject[];
  };
}
