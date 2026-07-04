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
  IAP_PLAN_BENEFIT_LIMITS,
  IAP_PLAN_LENGTH_LIMITS,
  IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS,
  IapCheckIssue,
  IapCheckIssueType,
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

  // Collect every *.json under `dir` recursively, so IAP files are found
  // regardless of whether they sit directly in in_app_purchases/ (flat layout)
  // or under flavor subfolders (e.g. dev/, prod/).
  private collectJsonFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const result: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...this.collectJsonFiles(full));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        result.push(full);
      }
    }
    return result;
  }

  public getIapFiles(platform: MetadataPlatform): string[] {
    return this.collectJsonFiles(this.getIapDirectory(platform)).filter(
      (file) => path.basename(file) !== SUBSCRIPTION_GROUPS_FILE_NAME
    );
  }

  public getSubscriptionGroupsFiles(): string[] {
    return this.collectJsonFiles(
      this.getIapDirectory(MetadataPlatform.ios)
    ).filter((file) => path.basename(file) === SUBSCRIPTION_GROUPS_FILE_NAME);
  }

  // Path relative to the platform's in_app_purchases dir, e.g. "dev/plans.json",
  // so log/progress messages disambiguate same-named files across flavors.
  private getIapRelativePath(platform: MetadataPlatform, file: string): string {
    return path.relative(this.getIapDirectory(platform), file);
  }

  public readPlans(file: string): IapPlan[] {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  }

  public writePlans(file: string, plans: IapPlan[]): void {
    fs.writeFileSync(file, JSON.stringify(plans, null, 2), "utf8");
  }

  private readSubscriptionGroups(file: string): IapSubscriptionGroup[] {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content);
  }

  public readSubscriptionGroupsFile(file: string): IapSubscriptionGroup[] {
    return this.readSubscriptionGroups(file);
  }

  public writeSubscriptionGroupsFile(
    file: string,
    groups: IapSubscriptionGroup[]
  ): void {
    fs.writeFileSync(file, JSON.stringify(groups, null, 2), "utf8");
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
      for (const sgFile of this.getSubscriptionGroupsFiles()) {
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
              // benefits are an Android-only array; translated element-wise.
              const sourceBenefits =
                platform === MetadataPlatform.android
                  ? sourceItem.benefits
                  : undefined;

              for (const targetLang of targetLanguages) {
                if (token.isCancellationRequested) {
                  Toast.i(`🟠 Canceled`);
                  return;
                }

                current++;
                progress.report({
                  increment: 100 / total,
                  message: `Translating ${this.getIapRelativePath(platform, file)} to ${targetLang.locale} (${current}/${total})`,
                });

                if (
                  !sourceTitle &&
                  !sourceDesc &&
                  !(sourceBenefits && sourceBenefits.length > 0)
                ) {
                  continue;
                }

                let targetItem = plan.localizations.find(
                  (l) => getIapLocale(platform, l) === targetLang.locale
                );
                if (!targetItem) {
                  targetItem = {};
                  setIapLocale(platform, targetItem, targetLang.locale);
                  plan.localizations.push(targetItem);
                }

                // Always re-translate target languages (Korean/English are the
                // hand-maintained source/exclude locales and never reach here).
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

                if (sourceBenefits && sourceBenefits.length > 0) {
                  const benefitsRes = await this.translationService.translate({
                    queries: sourceBenefits,
                    sourceLang: sourceMetadataLang.translateLanguage,
                    targetLang: targetLang.translateLanguage,
                  });
                  targetItem.benefits = benefitsRes.data;
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
    const files = this.getSubscriptionGroupsFiles();
    if (files.length === 0) {
      Toast.e(`${SUBSCRIPTION_GROUPS_FILE_NAME} not found.`);
      return;
    }

    const parsed: { file: string; groups: IapSubscriptionGroup[] }[] = [];
    for (const file of files) {
      try {
        parsed.push({ file, groups: this.readSubscriptionGroups(file) });
      } catch (e) {
        Toast.e(
          `Failed to parse ${this.getIapRelativePath(MetadataPlatform.ios, file)}.`
        );
      }
    }

    const total =
      parsed.reduce((sum, p) => sum + p.groups.length, 0) *
      targetLanguages.length;
    let current = 0;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        for (const { file, groups } of parsed) {
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
                message: `Translating ${this.getIapRelativePath(MetadataPlatform.ios, file)} to ${targetLang.locale} (${current}/${total})`,
              });

              if (!sourceName && sourceCustomAppName === undefined) {continue;}

              let targetItem = group.localizations.find(
                (l) => l.locale === targetLang.locale
              );
              if (!targetItem) {
                targetItem = { locale: targetLang.locale };
                group.localizations.push(targetItem);
              }

              // Always re-translate target languages (Korean/English are the
              // hand-maintained source/exclude locales and never reach here).
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
            fs.writeFileSync(file, JSON.stringify(groups, null, 2), "utf8");
          }
        }
      }
    );
  }

  // Anchor text to locate a "key": "value" pair in a 2-space-indented JSON file.
  private fieldAnchor(jsonKey: string, value: string): string {
    return `${JSON.stringify(jsonKey)}: ${JSON.stringify(value)}`;
  }

  // Scan every IAP file and return the length/consistency problems found, so the
  // caller can list them for selection and navigation.
  public checkIapFiles(): IapCheckIssue[] {
    const issues: IapCheckIssue[] = [];

    for (const platform of [MetadataPlatform.android, MetadataPlatform.ios]) {
      const { title: titleLimit, description: descLimit } =
        IAP_PLAN_LENGTH_LIMITS[platform];
      const tag = platform === MetadataPlatform.android ? "Android" : "iOS";
      const titleKey = platform === MetadataPlatform.android ? "title" : "name";
      for (const file of this.getIapFiles(platform)) {
        const label = this.getIapRelativePath(platform, file);
        try {
          const plans = this.readPlans(file);
          for (const plan of plans) {
            if (!plan.localizations) {continue;}
            for (const loc of plan.localizations) {
              const code = getIapLocale(platform, loc) ?? "";
              const title = getIapTitle(platform, loc);
              if (title && title.length > titleLimit) {
                issues.push({
                  type: IapCheckIssueType.titleTooLong,
                  filePath: file,
                  fileLabel: label,
                  platformTag: tag,
                  locale: code,
                  reason: `title exceeds ${titleLimit} chars (${title.length})`,
                  searchAnchor: this.fieldAnchor(titleKey, title),
                });
              }
              if (loc.description && loc.description.length > descLimit) {
                issues.push({
                  type: IapCheckIssueType.descriptionTooLong,
                  filePath: file,
                  fileLabel: label,
                  platformTag: tag,
                  locale: code,
                  reason: `description exceeds ${descLimit} chars (${loc.description.length})`,
                  searchAnchor: this.fieldAnchor("description", loc.description),
                });
              }
              // benefits are an Android-only array; skip on iOS.
              if (platform === MetadataPlatform.android && loc.benefits) {
                if (loc.benefits.length > IAP_PLAN_BENEFIT_LIMITS.maxCount) {
                  issues.push({
                    type: IapCheckIssueType.tooManyBenefits,
                    filePath: file,
                    fileLabel: label,
                    platformTag: tag,
                    locale: code,
                    reason: `benefits exceeds ${IAP_PLAN_BENEFIT_LIMITS.maxCount} items (${loc.benefits.length})`,
                    searchAnchor: `"benefits"`,
                  });
                }
                for (const benefit of loc.benefits) {
                  if (benefit.length > IAP_PLAN_BENEFIT_LIMITS.length) {
                    issues.push({
                      type: IapCheckIssueType.benefitTooLong,
                      filePath: file,
                      fileLabel: label,
                      platformTag: tag,
                      locale: code,
                      reason: `benefit exceeds ${IAP_PLAN_BENEFIT_LIMITS.length} chars (${benefit.length})`,
                      searchAnchor: JSON.stringify(benefit),
                    });
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error(`Failed to parse ${label}:`, e);
        }
      }
    }

    for (const sgFile of this.getSubscriptionGroupsFiles()) {
      const label = this.getIapRelativePath(MetadataPlatform.ios, sgFile);
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
            issues.push({
              type: IapCheckIssueType.customAppNameInconsistent,
              filePath: sgFile,
              fileLabel: label,
              platformTag: "iOS",
              locale: "",
              reason: `custom_app_name inconsistent — null in [${nullLocales}], set in [${valueLocales}]`,
              searchAnchor: "",
            });
          }

          for (const loc of group.localizations) {
            const code = loc.locale ?? "";
            if (
              loc.name &&
              loc.name.length > IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.name
            ) {
              issues.push({
                type: IapCheckIssueType.groupNameTooLong,
                filePath: sgFile,
                fileLabel: label,
                platformTag: "iOS",
                locale: code,
                reason: `name exceeds ${IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.name} chars (${loc.name.length})`,
                searchAnchor: this.fieldAnchor("name", loc.name),
              });
            }
            if (
              loc.custom_app_name &&
              loc.custom_app_name.length >
                IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.custom_app_name
            ) {
              issues.push({
                type: IapCheckIssueType.customAppNameTooLong,
                filePath: sgFile,
                fileLabel: label,
                platformTag: "iOS",
                locale: code,
                reason: `custom_app_name exceeds ${IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS.custom_app_name} chars (${loc.custom_app_name.length})`,
                searchAnchor: this.fieldAnchor(
                  "custom_app_name",
                  loc.custom_app_name
                ),
              });
            }
          }
        }
      } catch (e) {
        console.error(`Failed to parse ${label}:`, e);
      }
    }

    return issues;
  }
}
