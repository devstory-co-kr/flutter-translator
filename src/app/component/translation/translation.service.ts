import { Language } from "../language/language";
import { TranslationResult, TranslationType } from "./translation";

export interface EncodeResult {
  dictionary: Record<string, string>;
  encodedText: string;
}

export interface TranslationServicePaidParams {
  apiKey: string;
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
  useCache?: boolean;
}

export interface TranslationServiceFreeParams {
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
  useCache?: boolean;
  encode: (query: string, targetLanguage: Language) => EncodeResult;
  decode: (dictionary: Record<string, string>, encodedQuery: string) => string;
}

export interface TranslationServiceTranslateParams {
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
  useCache?: boolean;
  encode?: (query: string, targetLanguage: Language) => EncodeResult;
  decode?: (dictionary: Record<string, string>, encodedQuery: string) => string;
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
  }: TranslationServiceTranslateParams): Promise<TranslationResult>;
}
