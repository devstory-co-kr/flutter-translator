import { Language } from "../language/language";

export interface PaidTranslateRepositoryParams {
  apiKey: string;
  query: string;
  exclude: string[];
  sourceLang: Language;
  targetLang: Language;
  isEncodeARBParams?: boolean;
}

export interface FreeTranslateRepositoryParams {
  query: string;
  exclude: string[];
  sourceLang: Language;
  targetLang: Language;
  isEncodeARBParams?: boolean;
}

export interface TranslationRepository {
  paidTranslate({
    apiKey,
    query,
    exclude,
    sourceLang,
    targetLang,
  }: PaidTranslateRepositoryParams): Promise<string>;

  freeTranslate({
    query,
    exclude,
    sourceLang,
    targetLang,
  }: FreeTranslateRepositoryParams): Promise<string>;
}
