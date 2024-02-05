import { Language } from "../language/language";

export interface PaidTranslateRepositoryParams {
  apiKey: string;
  query: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface FreeTranslateRepositoryParams {
  query: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface TranslationRepository {
  paidTranslate({
    apiKey,
    query,
    sourceLang,
    targetLang,
  }: PaidTranslateRepositoryParams): Promise<string>;

  freeTranslate({
    query,
    sourceLang,
    targetLang,
  }: FreeTranslateRepositoryParams): Promise<string>;
}
