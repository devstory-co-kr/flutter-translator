import { MetadataPlatform } from "../metadata/metadata";

export interface IapPlan {
  localizations?: IapLocalization[];
}

export interface IapLocalization {
  // Android
  languageCode?: string;
  title?: string;
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
