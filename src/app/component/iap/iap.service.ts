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
  IapPlan,
  IapSubscriptionGroup,
  IapTranslateTarget,
  setIapLocale,
  setIapTitle,
  SUBSCRIPTION_GROUPS_FILE_NAME,
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
      .filter(
        (file) =>
          file.endsWith(".json") && file !== SUBSCRIPTION_GROUPS_FILE_NAME
      )
      .map((file) => path.join(dir, file));
  }

  public getSubscriptionGroupsFilePath(): string {
    return path.join(
      this.getIapDirectory(MetadataPlatform.ios),
      SUBSCRIPTION_GROUPS_FILE_NAME
    );
  }

  private readPlans(file: string): IapPlan[] {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  }

  private readSubscriptionGroups(file: string): IapSubscriptionGroup[] {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  }

  public getCommonLanguagesInIapFiles(
    platform: MetadataPlatform,
    target: IapTranslateTarget
  ): string[] {
    let common: Set<string> | undefined;

    if (target === IapTranslateTarget.plans) {
      for (const file of this.getIapFiles(platform)) {
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
    } else {
      const sgFile = this.getSubscriptionGroupsFilePath();
      if (fs.existsSync(sgFile)) {
        try {
          const groups = this.readSubscriptionGroups(sgFile);
          for (const group of groups) {
            const langs = new Set<string>();
            for (const loc of group.localizations ?? []) {
              if (loc.locale) {langs.add(loc.locale);}
            }
            if (common === undefined) {
              common = langs;
            } else {
              common = new Set([...common].filter((l) => langs.has(l)));
            }
          }
        } catch (e) {
          console.error(`Failed to parse ${sgFile}:`, e);
        }
      }
    }

    return common ? Array.from(common) : [];
  }

  public async translateIapFiles(
    platform: MetadataPlatform,
    target: IapTranslateTarget,
    sourceLocale: string,
    targetLanguages: MetadataLanguage[]
  ) {
    const sourceMetadataLang = this.metadataService
      .getSupportMetadataLanguages(platform)
      .find((l) => l.locale === sourceLocale);

    if (!sourceMetadataLang) {
      Toast.e(`Cannot find metadata language for locale: ${sourceLocale}`);
      return;
    }

    if (target === IapTranslateTarget.plans) {
      await this._translatePlans(
        platform,
        sourceLocale,
        sourceMetadataLang,
        targetLanguages
      );
    } else {
      await this._translateSubscriptionGroups(
        sourceLocale,
        sourceMetadataLang,
        targetLanguages
      );
    }

    Toast.i(`IAP translations completed.`);
  }

  private async _translatePlans(
    platform: MetadataPlatform,
    sourceLocale: string,
    sourceMetadataLang: MetadataLanguage,
    targetLanguages: MetadataLanguage[]
  ) {
    const files = this.getIapFiles(platform);
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
              if (!plan.localizations) {plan.localizations = [];}
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
                  message: `Translating ${path.basename(file)} to ${targetLang.locale} (${current}/${total})`,
                });

                if (!sourceTitle && !sourceDesc) {continue;}

                let targetItem = plan.localizations.find(
                  (l) => getIapLocale(platform, l) === targetLang.locale
                );
                if (!targetItem) {
                  targetItem = {};
                  setIapLocale(platform, targetItem, targetLang.locale);
                  plan.localizations.push(targetItem);
                }

                if (sourceTitle) {
                  const titleRes = await this.translationService.translate({
                    queries: [sourceTitle],
                    sourceLang: sourceMetadataLang.translateLanguage,
                    targetLang: targetLang.translateLanguage,
                  });
                  setIapTitle(platform, targetItem, titleRes.data[0]);
                }

                if (sourceDesc) {
                  const descRes = await this.translationService.translate({
                    queries: [sourceDesc],
                    sourceLang: sourceMetadataLang.translateLanguage,
                    targetLang: targetLang.translateLanguage,
                  });
                  targetItem.description = descRes.data[0];
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
  }

  private async _translateSubscriptionGroups(
    sourceLocale: string,
    sourceMetadataLang: MetadataLanguage,
    targetLanguages: MetadataLanguage[]
  ) {
    const sgFile = this.getSubscriptionGroupsFilePath();
    if (!fs.existsSync(sgFile)) {
      Toast.e(`${SUBSCRIPTION_GROUPS_FILE_NAME} not found.`);
      return;
    }

    let groups: IapSubscriptionGroup[];
    try {
      groups = this.readSubscriptionGroups(sgFile);
    } catch (e) {
      Toast.e(`Failed to parse ${SUBSCRIPTION_GROUPS_FILE_NAME}.`);
      return;
    }

    const total = groups.length * targetLanguages.length;
    let current = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        let isModified = false;

        for (const group of groups) {
          if (!group.localizations) {group.localizations = [];}
          const sourceItem = group.localizations.find(
            (l) => l.locale === sourceLocale
          );
          if (!sourceItem) {
            current += targetLanguages.length;
            continue;
          }

          const sourceName = sourceItem.name;
          const sourceCustomAppName = sourceItem.custom_app_name;

          for (const targetLang of targetLanguages) {
            if (token.isCancellationRequested) {
              Toast.i(`🟠 Canceled`);
              return;
            }

            current++;
            progress.report({
              increment: 100 / total,
              message: `Translating ${SUBSCRIPTION_GROUPS_FILE_NAME} to ${targetLang.locale} (${current}/${total})`,
            });

            if (!sourceName && sourceCustomAppName === undefined) {continue;}

            let targetItem = group.localizations.find(
              (l) => l.locale === targetLang.locale
            );
            if (!targetItem) {
              targetItem = { locale: targetLang.locale };
              group.localizations.push(targetItem);
            }

            if (sourceName) {
              const nameRes = await this.translationService.translate({
                queries: [sourceName],
                sourceLang: sourceMetadataLang.translateLanguage,
                targetLang: targetLang.translateLanguage,
              });
              targetItem.name = nameRes.data[0];
            }

            if (sourceCustomAppName) {
              const customRes = await this.translationService.translate({
                queries: [sourceCustomAppName],
                sourceLang: sourceMetadataLang.translateLanguage,
                targetLang: targetLang.translateLanguage,
              });
              targetItem.custom_app_name = customRes.data[0];
            } else {
              targetItem.custom_app_name = null;
            }

            isModified = true;
          }
        }

        if (isModified) {
          fs.writeFileSync(sgFile, JSON.stringify(groups, null, 2), "utf8");
        }
      }
    );
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

    const sgFile = this.getSubscriptionGroupsFilePath();
    if (fs.existsSync(sgFile)) {
      try {
        const groups = this.readSubscriptionGroups(sgFile);
        for (const group of groups) {
          if (!group.localizations) {continue;}

          const withCustom = group.localizations.filter(
            (l) => l.custom_app_name != null
          );
          const withoutCustom = group.localizations.filter(
            (l) => "custom_app_name" in l && l.custom_app_name == null
          );
          if (withCustom.length > 0 && withoutCustom.length > 0) {
            const nullLocales = withoutCustom.map((l) => l.locale ?? "").join(", ");
            const valueLocales = withCustom.map((l) => l.locale ?? "").join(", ");
            Toast.e(
              `[iOS] ${SUBSCRIPTION_GROUPS_FILE_NAME}: custom_app_name is inconsistent — null in [${nullLocales}], set in [${valueLocales}]`
            );
            hasError = true;
          }

          for (const loc of group.localizations) {
            const code = loc.locale ?? "";
            if (loc.name && loc.name.length > 75) {
              Toast.e(
                `[iOS] ${SUBSCRIPTION_GROUPS_FILE_NAME} - ${code}: name exceeds 75 chars (${loc.name.length})`
              );
              hasError = true;
            }
            if (loc.custom_app_name && loc.custom_app_name.length > 30) {
              Toast.e(
                `[iOS] ${SUBSCRIPTION_GROUPS_FILE_NAME} - ${code}: custom_app_name exceeds 30 chars (${loc.custom_app_name.length})`
              );
              hasError = true;
            }
          }
        }
      } catch (e) {}
    }

    if (!hasError) {
      Toast.i("IAP Check Passed: All lengths are within limits.");
    }
  }
}
