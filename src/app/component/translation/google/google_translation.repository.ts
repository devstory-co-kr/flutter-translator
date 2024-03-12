import * as he from "he";
import { Constant } from "../../../util/constant";
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
    exclude,
    sourceLang,
    targetLang,
  }: PaidTranslateRepositoryParams): Promise<string> {
    return this.translate(query, exclude, (text: string) =>
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
    return this.translate(query, exclude, (text: string) =>
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
  private encode(text: string, exclude: string[]): EncodeResult {
    let count = 0;
    const parmKeywordDict: Record<string, string> = {};
    const keywordParmDict: Record<string, string> = {};
    const encodedText = text.replace(/\b(\w+)\b/g, (match, keyword) => {
      if (
        exclude
          .map((e) => e.toLocaleLowerCase())
          .includes(keyword.toLowerCase())
      ) {
        let paramReplaceKey: string;
        if (keywordParmDict[keyword]) {
          paramReplaceKey = keywordParmDict[keyword];
        } else if (count >= Constant.paramReplaceKeys.length) {
          const share = Math.floor(count / Constant.paramReplaceKeys.length);
          const remainder = count % Constant.paramReplaceKeys.length;
          paramReplaceKey =
            Constant.paramReplaceKeys[share] +
            Constant.paramReplaceKeys[remainder];
          keywordParmDict[keyword] = paramReplaceKey;
          count++;
        } else {
          paramReplaceKey = Constant.paramReplaceKeys[count];
          keywordParmDict[keyword] = paramReplaceKey;
          count++;
        }
        parmKeywordDict[paramReplaceKey] = keyword;
        return paramReplaceKey;
      } else {
        return match;
      }
    });
    return {
      dictionary: parmKeywordDict,
      encodedText,
    };
  }

  /**
   * Decode encoded text
   */
  private decode(dictionary: Record<string, string>, text: string): string {
    const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      text = text.replace(new RegExp(key, "g"), dictionary[key]);
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
    onTranslate: (encodedText: string) => Promise<string>
  ): Promise<string> {
    try {
      // encode
      const { dictionary, encodedText }: EncodeResult = this.encode(
        query,
        exclude
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
