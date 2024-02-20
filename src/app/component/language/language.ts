import { ARBFileName, LanguageCode } from "../config/config";

export type Language = {
  // whether left to right or right to left
  isLTR: boolean;

  // google translation parameter
  gt: string;

  // language name
  name: string;

  // iso639-1
  languageCode: string;
};

export type CustomARBFileName = {
  data: Record<LanguageCode, ARBFileName>;
  languageCodeList: LanguageCode[];
  arbFileNameList: ARBFileName[];
};
