import { Language } from "../language/language";
import { TranslationResult, TranslationType } from "./translation";

export interface EncodeResult {
  dictionary: Record<string, string>;
  encodedText: string;
}

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
  encode: (query: string) => EncodeResult;
  decode: (dictionary: Record<string, string>, encodedQuery: string) => string;
}

export interface TranslationService {
  selectTranslationType(): Promise<TranslationType | undefined>;

  translate({
    queries,
    sourceLang,
    targetLang,
    encode,
    decode,
  }: {
    queries: string[];
    sourceLang: Language;
    targetLang: Language;
    encode?: (query: string) => EncodeResult;
    decode?: (
      dictionary: Record<string, string>,
      encodedQuery: string
    ) => string;
  }): Promise<TranslationResult>;
}
