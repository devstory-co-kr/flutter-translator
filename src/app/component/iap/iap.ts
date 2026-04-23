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
