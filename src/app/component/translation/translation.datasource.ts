import { Language } from "../language/language";

export interface PaidTranslateDataSourceParams {
  apiKey: string;
  text: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface FreeTranslateDataSourceParams {
  text: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface TranslationDataSource {
  paidTranslate({
    apiKey,
    text,
    sourceLang,
    targetLang,
  }: PaidTranslateDataSourceParams): Promise<string>;

  freeTranslate({
    text,
    sourceLang,
    targetLang,
  }: FreeTranslateDataSourceParams): Promise<string>;
}
