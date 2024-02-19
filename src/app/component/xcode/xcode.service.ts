import * as fs from "fs";
import * as vscode from "vscode";
import { ConfigService, FilePath } from "../config/config";
import { LanguageRepository } from "../language/language.repository";
import { LanguageService } from "../language/language.service";
import {
  XcodeLanguage,
  XcodePlatform,
  XcodeProject,
  XcodeProjectDirectoryExt,
  XcodeRepository,
  XcodeService,
  XcodeTarget,
  XcodeUnknownProject,
} from "./xcode";

interface InitParams {
  xcodeRepository: XcodeRepository;
  languageService: LanguageService;
  configService: ConfigService;
}

export class XcodeServiceImpl implements XcodeService {
  private xcodeRepository: XcodeRepository;
  private languageService: LanguageService;
  private configService: ConfigService;
  constructor({ xcodeRepository, languageService, configService }: InitParams) {
    this.xcodeRepository = xcodeRepository;
    this.languageService = languageService;
    this.configService = configService;
  }
  public getPlatforms(): XcodePlatform[] {
    const platforms: XcodePlatform[] = [];
    for (const platform of Object.values(XcodePlatform)) {
      const platformPath = this.xcodeRepository.getPlatformPath(platform);
      if (fs.existsSync(platformPath)) {
        platforms.push(platform);
      }
    }
    return platforms;
  }

  public async selectPlatform(
    platforms: XcodePlatform[]
  ): Promise<XcodePlatform | undefined> {
    return <XcodePlatform>await vscode.window.showQuickPick(platforms, {
      canPickMany: false,
      ignoreFocusOut: true,
      title: "Select a platform",
      placeHolder: "Please select a platform",
    });
  }

  public getTargets(platform: XcodePlatform): XcodeTarget[] {
    return this.xcodeRepository.getTargetPathList(platform);
  }

  public getProjects({
    platform,
    target,
  }: {
    platform: XcodePlatform;
    target: string;
  }): { projects: XcodeProject[]; unknownProjects: XcodeUnknownProject[] } {
    const { projects, unknownProjects } = this.xcodeRepository.getProjects({
      platform,
      target,
    });
    if (unknownProjects.length > 0) {
      // convert unknown project to project by xcode config custom field
      const custom = this.configService.getCustomXcodeProjectLanguageCode();
      for (let i = 0; i < unknownProjects.length; i++) {
        const unknownProject = unknownProjects[i];
        const languageCode = custom[unknownProject.name];
        if (!languageCode) {
          continue;
        }
        const language = LanguageRepository.supportLanguages.find(
          (l) => l.languageCode === languageCode
        );
        if (!language) {
          continue;
        }

        projects.push({
          ...unknownProject,
          language: {
            locale: unknownProject.name.replace(XcodeProjectDirectoryExt, ""),
            name: unknownProject.name,
            translateLanguage: language,
          },
        });
        unknownProjects.splice(i, 1);
      }
    }
    return { projects, unknownProjects };
  }

  public async selectUnknownProjectLanguage(
    unknownProject: XcodeUnknownProject
  ): Promise<XcodeLanguage | undefined> {
    const language = await this.configService.setCustomXcodeProjectLanguage(
      unknownProject.name
    );
    if (!language) {
      return;
    }

    return {
      locale: unknownProject.name.replace(XcodeProjectDirectoryExt, ""),
      name: unknownProject.name,
      translateLanguage: language,
    };
  }

  public getStringsData(stringsFilePath: FilePath): Record<string, string> {
    const fileContent = fs.readFileSync(stringsFilePath, "utf-8");
    const regex = /(?<!\/\/)(\w+)\s*=\s*\"([^\"]+)\";/g;

    let match;
    const data: Record<string, string> = {};
    while ((match = regex.exec(fileContent)) !== null) {
      const key = match[1];
      const value = match[2];
      data[key] = value;
    }
    return data;
  }

  public setStringsData(
    stringsFilePath: FilePath,
    data: Record<string, string>
  ): void {
    let fileContent = fs.readFileSync(stringsFilePath, "utf-8");
    const commentRegex =
      /(?:(?:\/\*[\s\S]*?\*\/)|(?:\/\/.*$))|(\w+)\s*=\s*\"([^\"]+)\";/gm;

    let match;
    let newFileContent = "";
    while ((match = commentRegex.exec(fileContent)) !== null) {
      if (match[0].startsWith("/*") || match[0].startsWith("//")) {
        // comment
        newFileContent += match[0] + "\n";
      } else {
        // clear previous data
        newFileContent += ``;
      }
    }

    // add data
    for (const [key, value] of Object.entries(data)) {
      newFileContent += `${key}="${value}";\n`;
    }

    fs.writeFileSync(stringsFilePath, newFileContent);
  }
}
