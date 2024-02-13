import { ARBFileName, LanguageCode } from "../config/config";

export type Language = {
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
