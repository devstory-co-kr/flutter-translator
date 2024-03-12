import { Language } from "../language/language";
import { TranslationResult, TranslationType } from "./translation";

export interface PaidTranslateServiceParams {
  apiKey: string;
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
}

export interface FreeTranslateServiceParams {
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
}

export interface TranslationService {
  selectTranslationType(): Promise<TranslationType | undefined>;

  translate({
    queries,
    sourceLang,
    targetLang,
  }: {
    queries: string[];
    sourceLang: Language;
    targetLang: Language;
  }): Promise<TranslationResult>;
}
