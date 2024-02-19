import * as fs from "fs";
import path from "path";
import { IosXcodeLanguage } from "../../platform/ios/ios.strings_language";
import { Workspace } from "../../util/workspace";
import { FilePath } from "../config/config";
import {
  XcodePlatform,
  XcodeProject,
  XcodeProjectDirectoryExt,
  XcodeRepository,
  XcodeUnknownProject,
} from "./xcode";

interface InitParams {
  iosXcodeLanguage: IosXcodeLanguage;
}

export class XcodeRepositoryImpl implements XcodeRepository {
  private iosXcodeLanguage: IosXcodeLanguage;
  constructor({ iosXcodeLanguage }: InitParams) {
    this.iosXcodeLanguage = iosXcodeLanguage;
  }

  public getTargetPathList(platform: XcodePlatform): string[] {
    const platformPath = this.getPlatformPath(platform);
    const targetDirList = fs
      .readdirSync(platformPath)
      .filter((item) => fs.statSync(`${platformPath}/${item}`).isDirectory());
    // Target the folder containing the Info.plist file.
    return targetDirList.filter((targetDir) => {
      const infoPlistPath = path.join(platformPath, targetDir, "Info.plist");
      return fs.existsSync(infoPlistPath);
    });
  }

  public getPlatformPath(platform: XcodePlatform): FilePath {
    const root = Workspace.getRoot();
    return path.join(root, platform);
  }

  public getProjects({
    platform,
    target,
  }: {
    platform: XcodePlatform;
    target: string;
  }): {
    projects: XcodeProject[];
    unknownProjects: XcodeUnknownProject[];
  } {
    const projects: XcodeProject[] = [];
    const unknownProjects: XcodeUnknownProject[] = [];
    const targetPath = Workspace.getPath(platform, target);
    const files = fs.readdirSync(targetPath);
    for (const file of files) {
      if (file === "Base.lproj") {
        continue;
      }

      const filePath = path.join(targetPath, file);
      const isDirectory = fs.statSync(filePath).isDirectory;
      if (!isDirectory || !filePath.endsWith(XcodeProjectDirectoryExt)) {
        continue;
      }
      const locale = file.replace(XcodeProjectDirectoryExt, "");
      const xcodeLanguage = this.iosXcodeLanguage.supportXcodeLanguages.find(
        (xcodeLanguage) => {
          return xcodeLanguage.locale === locale;
        }
      );
      const stringsFilePath = fs
        .readdirSync(filePath)
        .filter((v) => v.endsWith(".strings"))
        .map((v) => path.join(filePath, v));
      if (!xcodeLanguage) {
        unknownProjects.push({
          name: file,
          filePath,
          stringsFilePathList: stringsFilePath,
        });
      } else {
        projects.push({
          language: xcodeLanguage,
          name: file,
          filePath,
          stringsFilePathList: stringsFilePath,
        });
      }
    }
    return {
      projects,
      unknownProjects,
    };
  }
}
