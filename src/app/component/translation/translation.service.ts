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
  useCache: boolean;
}

export interface FreeTranslateServiceParams {
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
  useCache: boolean;
  encode: (query: string, targetLanguage: Language) => EncodeResult;
  decode: (dictionary: Record<string, string>, encodedQuery: string) => string;
}

export interface TranslationService {
  selectTranslationType(): Promise<TranslationType | undefined>;

  translate({
    queries,
    sourceLang,
    targetLang,
    useCache,
    encode,
    decode,
  }: {
    queries: string[];
    sourceLang: Language;
    targetLang: Language;
    useCache?: boolean;
    encode?: (query: string, targetLanguage: Language) => EncodeResult;
    decode?: (
      dictionary: Record<string, string>,
      encodedQuery: string
    ) => string;
  }): Promise<TranslationResult>;
}
