import * as he from "he";
import { TranslationFailureException } from "../../../util/exceptions";
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
    sourceLang,
    targetLang,
  }: PaidTranslateRepositoryParams): Promise<string> {
    return this.translate(query, (text: string) =>
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
    sourceLang,
    targetLang,
  }: FreeTranslateRepositoryParams): Promise<string> {
    return this.translate(query, (text: string) =>
      this.translationDataSource.freeTranslate({
        text,
        sourceLang,
        targetLang,
      })
    );
  }

  private paramReplaceKeys: string[] = [
    "😀",
    "😃",
    "😄",
    "😁",
    "🥹",
    "😅",
    "😂",
    "🤣",
    "🥲",
    "😊",
  ];

  /**
   * Encode arb parameters
   * @param text
   * @returns EncodeResult
   */
  private encodeText(text: string): EncodeResult {
    let count = 0;
    const dictionary: Record<string, string> = {};
    const encodedText: string = text.replace(/\{(.+?)\}/g, (_, match) => {
      if (count >= this.paramReplaceKeys.length) {
        throw new TranslationFailureException(
          `The number of parameters has exceeded the maximum (${this.paramReplaceKeys.length}).`
        );
      }
      const replacement = this.paramReplaceKeys[count];
      dictionary[replacement] = `{${match}}`;
      count++;
      return replacement;
    });
    return {
      dictionary,
      encodedText,
    };
  }

  /**
   * Decode encoded text
   * @param dictionary
   * @param text
   * @returns string
   */
  private decodeText(dictionary: Record<string, string>, text: string): string {
    let result: string = text;
    const dictKeys = Object.keys(dictionary);

    // restore {params}
    for (const i in dictKeys) {
      const key = dictKeys[i];
      result = result.replace(key, (match) => {
        return dictionary[match] || match;
      });
    }

    // decode html entity (e.g. &#39; -> ' / &gt; -> >)
    result = he.decode(result);

    // replace punctuation marks
    result.replaceAll("（", "(");
    result.replaceAll("）", ")");
    result.replaceAll("！", "!");
    result.replaceAll("？", "?");

    return result;
  }

  /**
   * Translate with google translator
   * @param query
   * @param onTranslate
   * @returns Promise<string>
   */
  private async translate(
    query: string,
    onTranslate: (encodedText: string) => Promise<string>
  ): Promise<string> {
    try {
      // encode
      const { dictionary, encodedText }: EncodeResult = this.encodeText(query);

      // translate
      const translatedText = await onTranslate(encodedText);

      // decode
      const decodedText = this.decodeText(dictionary, translatedText);
      return decodedText;
    } catch (e: any) {
      throw new TranslationFailureException(
        e.response?.data.error.message ?? `Translation failed : ${e.message}`
      );
    }
  }
}
