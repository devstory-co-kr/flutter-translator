import { ArbFileName, LanguageCode } from "../config/config";

export interface Language {
  // google translation parameter
  gt: string;

  // language name
  name: string;

  // iso639-1
  languageCode: string;
}

export interface CustomArbFileName {
  data: Record<LanguageCode, ArbFileName>;
  languageCodeList: LanguageCode[];
  arbFileNameList: ArbFileName[];
}
