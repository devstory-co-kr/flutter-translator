import { Language } from "../../language/language";
import { Crypto } from "../../util/crypto";

export type Cache = {
  [sourceLanguageCode: string]: {
    [targetLanguageCode: string]: {
      [querySHA1: string]: any;
    };
  };
};

export class TranslationCacheKey {
  private sourceLanguage: Language;
  private targetLanguage: Language;
  public sourceArbValueSHA1: string;

  get sourceLanguageCode(): string {
    return this.sourceLanguage.languageCode;
  }
  get targetLanguageCode(): string {
    return this.targetLanguage.languageCode;
  }

  constructor({
    sourceArbValue,
    sourceLanguage,
    targetLanguage,
  }: {
    sourceArbValue: string;
    sourceLanguage: Language;
    targetLanguage: Language;
  }) {
    this.sourceLanguage = sourceLanguage;
    this.targetLanguage = targetLanguage;
    this.sourceArbValueSHA1 = Crypto.generateSHA1(sourceArbValue);
  }
}
