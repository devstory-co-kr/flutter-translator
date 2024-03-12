import path from "path";
import * as vscode from "vscode";
import { FilePath } from "../../component/config/config";
import { TranslationService } from "../../component/translation/translation.service";
import {
  XcodePlatform,
  XcodeProject,
  XcodeService,
  XcodeTarget,
  XcodeUnknownProject,
} from "../../component/xcode/xcode";
import { Toast } from "../../util/toast";

interface InitParams {
  xcodeService: XcodeService;
  translationService: TranslationService;
}

export type XcodeStringsTranslateCmdArgs = {};

export class XcodeStringsTranslateCmd {
  private xcodeService: XcodeService;
  private translationService: TranslationService;
  constructor({ xcodeService, translationService }: InitParams) {
    this.xcodeService = xcodeService;
    this.translationService = translationService;
  }

  public async run(args?: XcodeStringsTranslateCmdArgs) {
    // get platforms
    const platforms = this.xcodeService.getPlatforms();
    if (platforms.length === 0) {
      Toast.i("There is no xcode ios or macos folder in the project.");
      return;
    }

    let platform: XcodePlatform = platforms[0];
    if (platforms.length > 1) {
      // select platform
      const selectedPlatform = await this.xcodeService.selectPlatform(
        platforms
      );
      if (!selectedPlatform) {
        return;
      }
      platform = selectedPlatform;
    }

    // get targets
    const targets = this.xcodeService.getTargets(platform);
    if (targets.length === 0) {
      Toast.i(`There is no Runner folder in ${platform}`);
      return;
    }
    let target: XcodeTarget = targets[0];
    if (targets.length > 1) {
      // select target
      const selectedTarget = await vscode.window.showQuickPick(targets, {
        canPickMany: false,
        ignoreFocusOut: true,
        title: "Select a target",
        placeHolder: `Please select a target in ${platform}.`,
      });
      if (!selectedTarget) {
        return;
      }
      target = selectedTarget;
    }

    // get xcode projects
    let { projects, unknownProjects } = this.xcodeService.getProjects({
      platform,
      target,
    });

    if (unknownProjects.length > 0) {
      // select unknown project language
      const convertedProjects = await this.selectUnknownProjectLanguageList(
        unknownProjects
      );
      if (!convertedProjects) {
        return;
      }
      projects = { ...projects, ...convertedProjects };
    }

    if (projects.length < 2) {
      Toast.i("There are no files to translate.");
      return;
    }
    // select source
    const sourceSelection = await vscode.window.showQuickPick(
      projects.map((project) => {
        return {
          label: `${project.name} (${project.language.name})`,
          project,
        };
      }),
      {
        title: "Select translation source",
        placeHolder: "Please select a translation source.",
        ignoreFocusOut: true,
        canPickMany: false,
      }
    );
    if (!sourceSelection) {
      return;
    }
    const sourceProject = sourceSelection.project;
    if (sourceProject.stringsFilePathList.length === 0) {
      Toast.i(`There is no .strings files in ${sourceProject.filePath}`);
      return;
    }

    // select files to translate
    let sourceStringsFilePathList = sourceProject.stringsFilePathList;
    if (sourceStringsFilePathList.length > 1) {
      const sourceStringsFilesSelections = await vscode.window.showQuickPick(
        sourceStringsFilePathList.map((stringsFilePath) => {
          const data = this.xcodeService.getStringsData(stringsFilePath);
          const length = Object.values(data).length;
          const isEmpty = length === 0;
          return {
            label: path.basename(stringsFilePath),
            description: isEmpty ? "No data" : `${length} items`,
            picked: !isEmpty,
            stringsFilePath,
          };
        }),
        {
          title: "Select strings files",
          placeHolder: "Please select the strings files to translate.",
          canPickMany: true,
          ignoreFocusOut: true,
        }
      );
      if (!sourceStringsFilesSelections) {
        return;
      }
      sourceStringsFilePathList = (sourceStringsFilesSelections ?? []).map(
        (s) => s.stringsFilePath
      );
    }

    // select target
    const targetSelections = await vscode.window.showQuickPick(
      projects
        .filter((p) => p !== sourceProject)
        .map((project) => {
          return {
            label: `${project.name} (${project.language.name})`,
            picked: true,
            project,
          };
        }),
      {
        title: "Select target",
        placeHolder: "Please select the targets to translate.",
        ignoreFocusOut: true,
        canPickMany: true,
      }
    );
    const targetProjects = (targetSelections ?? []).map((s) => s.project);
    if (targetProjects.length === 0) {
      return;
    }

    // translate strings
    const totalTranslatedLanguages = await this.translateStrings(
      sourceProject,
      targetProjects,
      sourceStringsFilePathList
    );
    Toast.i(`Total ${totalTranslatedLanguages} languages translated.`);
  }

  private async translateStrings(
    sourceProject: XcodeProject,
    targetProjects: XcodeProject[],
    sourceStringsFilePathList: FilePath[]
  ): Promise<number> {
    const total = targetProjects.length;
    let totalTranslatedProject: number = 0;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const sourceStringsFilePath of sourceStringsFilePathList) {
          const sourceStringsFileName = path.basename(sourceStringsFilePath);
          for (const targetProject of targetProjects) {
            if (token.isCancellationRequested) {
              // cancel
              Toast.i(`🟠 Canceled`);
              return;
            }

            for (const targetStringsFilePath of targetProject.stringsFilePathList) {
              const targetStringsFileName = path.basename(
                targetStringsFilePath
              );
              if (sourceStringsFileName !== targetStringsFileName) {
                continue;
              }
              const sourceData = this.xcodeService.getStringsData(
                sourceStringsFilePath
              );

              const translateResult = await this.translationService.translate({
                queries: Object.values(sourceData),
                sourceLang: sourceProject.language.translateLanguage,
                targetLang: targetProject.language.translateLanguage,
              });
              const translatedTargetData: Record<string, string> = {};
              Object.keys(sourceData).forEach(
                (key, index) =>
                  (translatedTargetData[key] = translateResult.data[index])
              );
              this.xcodeService.setStringsData(
                targetStringsFilePath,
                translatedTargetData
              );
            }

            totalTranslatedProject += 1;
            progress.report({
              increment: 100 / total,
              message: `${targetProject.name} translated. (${totalTranslatedProject} / ${total})`,
            });
          }
        }
      }
    );
    return totalTranslatedProject;
  }

  private async selectUnknownProjectLanguageList(
    unknownProjects: XcodeUnknownProject[]
  ): Promise<XcodeProject[] | undefined> {
    const total = unknownProjects.length;
    const projects: XcodeProject[] = [];
    let totalSelected: number = 0;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        // select unknown projects language
        progress.report({
          increment: 0,
          message: `Select unknown project language. (${totalSelected} / ${total})`,
        });
        for (const unknownProject of unknownProjects) {
          if (token.isCancellationRequested) {
            // cancel
            Toast.i(`🟠 Canceled`);
            return;
          }

          const language = await this.xcodeService.selectUnknownProjectLanguage(
            unknownProject
          );

          if (!language) {
            return;
          }
          projects.push(<XcodeProject>{
            ...unknownProject,
            language,
          });
          totalSelected += 1;
          progress.report({
            increment: 100 / total,
            message: `Select unknown project language. (${totalSelected} / ${total})`,
          });
        }
      }
    );
    return projects;
  }
}
