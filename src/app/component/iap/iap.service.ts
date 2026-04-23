import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { MetadataLanguage, MetadataPlatform } from "../metadata/metadata";
import { MetadataService } from "../metadata/metadata.service";
import { TranslationService } from "../translation/translation.service";
import {
  getIapLocale,
  getIapTitle,
  IapLocalization,
  IapPlan,
  setIapLocale,
  setIapTitle,
} from "./iap";

interface InitParams {
  metadataService: MetadataService;
  translationService: TranslationService;
}

export class IapService {
  private metadataService: MetadataService;
  private translationService: TranslationService;

  constructor({ metadataService, translationService }: InitParams) {
    this.metadataService = metadataService;
    this.translationService = translationService;
  }

  public getIapDirectory(platform: MetadataPlatform): string {
    const workspacePath = Workspace.getRoot();
    return path.join(
      workspacePath,
      platform === MetadataPlatform.android ? "android" : "ios",
      "fastlane",
      "in_app_purchases"
    );
  }

  public getIapFiles(platform: MetadataPlatform): string[] {
    const dir = this.getIapDirectory(platform);
    if (!fs.existsSync(dir)) {
      return [];
    }
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.join(dir, file));
  }

  private readPlans(file: string): IapPlan[] {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  }

  public getCommonLanguagesInIapFiles(platform: MetadataPlatform): string[] {
    const files = this.getIapFiles(platform);
    let common: Set<string> | undefined;

    for (const file of files) {
      try {
        const plans = this.readPlans(file);
        for (const plan of plans) {
          const langs = new Set<string>();
          for (const loc of plan.localizations ?? []) {
            const code = getIapLocale(platform, loc);
            if (code) {langs.add(code);}
          }
          if (common === undefined) {
            common = langs;
          } else {
            common = new Set([...common].filter((l) => langs.has(l)));
          }
        }
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e);
      }
    }

    return common ? Array.from(common) : [];
  }

  public async translateIapFiles(
    platform: MetadataPlatform,
    sourceLocale: string,
    targetLanguages: MetadataLanguage[]
  ) {
    const files = this.getIapFiles(platform);
    const sourceMetadataLang = this.metadataService
      .getSupportMetadataLanguages(platform)
      .find((l) => l.locale === sourceLocale);

    if (!sourceMetadataLang) {
      Toast.e(`Cannot find metadata language for locale: ${sourceLocale}`);
      return;
    }

    let totalPlans = 0;
    for (const file of files) {
      try {
        totalPlans += this.readPlans(file).length;
      } catch (e) {}
    }
    const total = totalPlans * targetLanguages.length;
    let current = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const file of files) {
          try {
            const plans = this.readPlans(file);
            let isModified = false;

            for (const plan of plans) {
              if (!plan.localizations) {
                plan.localizations = [];
              }
              const sourceItem = plan.localizations.find(
                (l) => getIapLocale(platform, l) === sourceLocale
              );
              if (!sourceItem) {
                current += targetLanguages.length;
                continue;
              }

              const sourceTitle = getIapTitle(platform, sourceItem);
              const sourceDesc = sourceItem.description;

              for (const targetLang of targetLanguages) {
                if (token.isCancellationRequested) {
                  Toast.i(`🟠 Canceled`);
                  return;
                }

                current++;
                progress.report({
                  increment: 100 / total,
                  message: `Translating ${path.basename(file)} to ${
                    targetLang.locale
                  } (${current}/${total})`,
                });

                if (!sourceTitle && !sourceDesc) {continue;}

                let translatedTitle = "";
                let translatedDesc = "";

                if (sourceTitle) {
                  const titleRes = await this.translationService.translate({
                    queries: [sourceTitle],
                    sourceLang: sourceMetadataLang.translateLanguage,
                    targetLang: targetLang.translateLanguage,
                  });
                  translatedTitle = titleRes.data[0];
                }

                if (sourceDesc) {
                  const descRes = await this.translationService.translate({
                    queries: [sourceDesc],
                    sourceLang: sourceMetadataLang.translateLanguage,
                    targetLang: targetLang.translateLanguage,
                  });
                  translatedDesc = descRes.data[0];
                }

                let targetItem = plan.localizations.find(
                  (l) => getIapLocale(platform, l) === targetLang.locale
                );
                if (!targetItem) {
                  targetItem = {};
                  setIapLocale(platform, targetItem, targetLang.locale);
                  plan.localizations.push(targetItem);
                }
                if (translatedTitle) {
                  setIapTitle(platform, targetItem, translatedTitle);
                }
                if (translatedDesc) {
                  targetItem.description = translatedDesc;
                }
                isModified = true;
              }
            }

            if (isModified) {
              fs.writeFileSync(file, JSON.stringify(plans, null, 2), "utf8");
            }
          } catch (e) {
            console.error(`Failed to process ${file}:`, e);
          }
        }
      }
    );

    Toast.i(`IAP translations completed.`);
  }

  public checkIapFiles() {
    let hasError = false;

    const platformLimits: Record<
      MetadataPlatform,
      { title: number; description: number }
    > = {
      [MetadataPlatform.android]: { title: 55, description: 200 },
      [MetadataPlatform.ios]: { title: 35, description: 55 },
    };

    for (const platform of [MetadataPlatform.android, MetadataPlatform.ios]) {
      const { title: titleLimit, description: descLimit } =
        platformLimits[platform];
      const tag = platform === MetadataPlatform.android ? "Android" : "iOS";
      const files = this.getIapFiles(platform);
      for (const file of files) {
        try {
          const plans = this.readPlans(file);
          for (const plan of plans) {
            if (!plan.localizations) {continue;}
            for (const loc of plan.localizations) {
              const code = getIapLocale(platform, loc) ?? "";
              const title = getIapTitle(platform, loc);
              if (title && title.length > titleLimit) {
                Toast.e(
                  `[${tag}] ${path.basename(file)} - ${code}: title exceeds ${titleLimit} chars (${title.length})`
                );
                hasError = true;
              }
              if (loc.description && loc.description.length > descLimit) {
                Toast.e(
                  `[${tag}] ${path.basename(file)} - ${code}: description exceeds ${descLimit} chars (${loc.description.length})`
                );
                hasError = true;
              }
            }
          }
        } catch (e) {}
      }
    }

    if (!hasError) {
      Toast.i("IAP Check Passed: All lengths are within limits.");
    }
  }
}
