import { MetadataPlatform } from "../metadata/metadata";

export interface IapPlan {
  localizations?: IapLocalization[];
}

export interface IapLocalization {
  // Android
  languageCode?: string;
  title?: string;
  benefits?: string[];
  // iOS
  locale?: string;
  name?: string;
  // Common
  description?: string;
}

export interface IapSubscriptionGroup {
  localizations?: IapSubscriptionGroupLocalization[];
}

export interface IapSubscriptionGroupLocalization {
  locale?: string;
  name?: string;
  custom_app_name?: string | null;
}

export const SUBSCRIPTION_GROUPS_FILE_NAME = "subscription_groups.json";

export enum IapTranslateTarget {
  plans = "plans",
  subscriptionGroups = "subscriptionGroups",
}

// Logical translatable fields. `title` maps to the platform-specific key
// (Android `title` / iOS `name`) via getIapTitle/setIapTitle; the rest map
// directly to their key of the same name.
export enum IapField {
  title = "title",
  description = "description",
  // One element of the Android `benefits` array. Each element is translated as
  // its own unit (carrying its array index); Android-only.
  benefit = "benefit",
  name = "name",
  customAppName = "custom_app_name",
}

// Store-listing length limits — single source of truth shared by the IAP
// length check (IapService.checkIapFiles) and the MCP translation validation
// (McpBridge.finish_iap_translation).
export const IAP_PLAN_LENGTH_LIMITS: Record<
  MetadataPlatform,
  { title: number; description: number }
> = {
  [MetadataPlatform.android]: { title: 55, description: 200 },
  [MetadataPlatform.ios]: { title: 35, description: 55 },
};

export const IAP_SUBSCRIPTION_GROUP_LENGTH_LIMITS = {
  name: 75,
  custom_app_name: 30,
};

// Android plan `benefits` array limits (Play Store). Benefits are Android-only:
// each element is capped at `length` chars and a plan may list at most
// `maxCount` of them.
export const IAP_PLAN_BENEFIT_LIMITS = {
  length: 40,
  maxCount: 4,
};

// Categories of problems reported by IapService.checkIapFiles, used as the
// section labels in the IAP check picker.
export enum IapCheckIssueType {
  titleTooLong = "Title too long",
  descriptionTooLong = "Description too long",
  benefitTooLong = "Benefit too long",
  tooManyBenefits = "Too many benefits",
  groupNameTooLong = "Group name too long",
  customAppNameTooLong = "custom_app_name too long",
  customAppNameInconsistent = "custom_app_name inconsistent",
}

// A single problem found by the IAP check, carrying both what to show in the
// picker and where to jump to when selected.
export interface IapCheckIssue {
  type: IapCheckIssueType;
  filePath: string;
  // Path relative to in_app_purchases/, e.g. "dev/plans.json", for display.
  fileLabel: string;
  platformTag: string;
  locale: string;
  reason: string;
  // Text to locate in the file for navigation ("" → just open the file).
  searchAnchor: string;
}

export function getIapLocale(
  platform: MetadataPlatform,
  loc: IapLocalization
): string | undefined {
  return platform === MetadataPlatform.android ? loc.languageCode : loc.locale;
}

export function setIapLocale(
  platform: MetadataPlatform,
  loc: IapLocalization,
  value: string
): void {
  if (platform === MetadataPlatform.android) {
    loc.languageCode = value;
  } else {
    loc.locale = value;
  }
}

export function getIapTitle(
  platform: MetadataPlatform,
  loc: IapLocalization
): string | undefined {
  return platform === MetadataPlatform.android ? loc.title : loc.name;
}

export function setIapTitle(
  platform: MetadataPlatform,
  loc: IapLocalization,
  value: string
): void {
  if (platform === MetadataPlatform.android) {
    loc.title = value;
  } else {
    loc.name = value;
  }
}
