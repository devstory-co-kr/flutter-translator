import * as he from "he";
import { TranslationFailureException } from "../../../util/exceptions";
import { Language } from "../../language/language";
import { LanguageRepository } from "../../language/language.repository";
import { TranslationCacheRepository } from "../cache/translation_cache.repository";
import { TranslationDataSource } from "../translation.datasource";
import {
  FreeTranslateRepositoryParams,
  PaidTranslateRepositoryParams,
  TranslationRepository,
} from "../translation.repository";

interface EncodeResult {
  dictionary: Record<string, string>;
  encodedText: string;
}

interface InitParams {
  translationCacheRepository: TranslationCacheRepository;
  translationDataSource: TranslationDataSource;
}

export class GoogleTranslationRepository implements TranslationRepository {
  private translationDataSource: TranslationDataSource;

  constructor({ translationDataSource }: InitParams) {
    this.translationDataSource = translationDataSource;
  }

  public async paidTranslate({
    apiKey,
    query,
    exclude,
    sourceLang,
    targetLang,
  }: PaidTranslateRepositoryParams): Promise<string> {
    return this.translate(query, exclude, targetLang, (text: string) =>
      this.translationDataSource.paidTranslate({
        apiKey,
        text,
        sourceLang,
        targetLang,
      })
    );
  }

  public async freeTranslate({
    query,
    exclude,
    sourceLang,
    targetLang,
  }: FreeTranslateRepositoryParams): Promise<string> {
    return this.translate(query, exclude, targetLang, (text: string) =>
      this.translationDataSource.freeTranslate({
        text,
        sourceLang,
        targetLang,
      })
    );
  }

  /**
   * Encode exclusion keywords
   */
  private encode(
    text: string,
    exclude: string[],
    targetLanguage: Language
  ): EncodeResult {
    let count = 0;
    const dictionary: Record<string, string> = {};
    const replaceKeys = LanguageRepository.getReplaceKeys(targetLanguage);

    // Convert \n to replaceKey because Serbian does not support \n translation
    const replaceKey = replaceKeys[count];
    text = text.replaceAll("\\n", replaceKey);
    dictionary[replaceKey] = "\\n";
    count++;

    for (const e of exclude) {
      text = text.replace(new RegExp(e, "gi"), (match) => {
        const i = Object.values(dictionary).indexOf(match);
        const isDictionary = i !== -1;
        if (isDictionary) {
          // in the dictionary
          const replaceKey = Object.keys(dictionary)[i];
          return replaceKey;
        } else {
          // not in dictionary
          const replaceKey = replaceKeys[count];
          dictionary[replaceKey] = match;
          count++;
          return replaceKey;
        }
      });
    }

    return { encodedText: text, dictionary };
  }

  /**
   * Decode encoded text
   */
  private decode(dictionary: Record<string, string>, text: string): string {
    const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      text = text.replaceAll(key, dictionary[key]);
    }

    // decode html entity (e.g. &#39; -> ' / &gt; -> >)
    text = he.decode(text);

    // replace punctuation marks
    text.replaceAll("（", "(");
    text.replaceAll("）", ")");
    text.replaceAll("！", "!");
    text.replaceAll("？", "?");
    return text;
  }

  /**
   * Translate with google translator
   * @param query
   * @param onTranslate
   * @returns Promise<string>
   */
  private async translate(
    query: string,
    exclude: string[],
    targetLanguage: Language,
    onTranslate: (encodedText: string) => Promise<string>
  ): Promise<string> {
    try {
      // encode
      const { dictionary, encodedText }: EncodeResult = this.encode(
        query,
        exclude,
        targetLanguage
      );

      // translate
      const translatedText = await onTranslate(encodedText);

      // decode
      const decodedText = this.decode(dictionary, translatedText);
      return decodedText;
    } catch (e: any) {
      throw new TranslationFailureException(
        e.response?.data.error.message ?? `Translation failed : ${e.message}`
      );
    }
  }
}
