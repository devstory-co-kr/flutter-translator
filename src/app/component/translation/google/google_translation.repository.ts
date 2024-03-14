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
    isEncodeARBParams,
  }: PaidTranslateRepositoryParams): Promise<string> {
    return this.translate({
      query,
      exclude,
      targetLang,
      isEncodeARBParams,
      onTranslate: (text: string) =>
        this.translationDataSource.paidTranslate({
          apiKey,
          text,
          sourceLang,
          targetLang,
        }),
    });
  }

  public async freeTranslate({
    query,
    exclude,
    sourceLang,
    targetLang,
    isEncodeARBParams,
  }: FreeTranslateRepositoryParams): Promise<string> {
    return this.translate({
      query,
      exclude,
      targetLang,
      isEncodeARBParams,
      onTranslate: (text: string) =>
        this.translationDataSource.freeTranslate({
          text,
          sourceLang,
          targetLang,
        }),
    });
  }

  /**
   * Encode
   */
  private encode({
    text,
    regex,
    encodeKeys,
    dictionary,
  }: {
    text: string;
    regex: RegExp;
    encodeKeys: string[];
    dictionary: Record<string, string>;
  }): string {
    let count = Object.keys(dictionary).length;
    const swapedDict = Object.fromEntries(
      Object.entries(dictionary).map((a) => a.reverse())
    );
    const encodedText = text.replace(regex, (match, _) => {
      let key: string;
      if (swapedDict[match]) {
        key = swapedDict[match];
      } else if (count >= encodeKeys.length) {
        const share = Math.floor(count / encodeKeys.length);
        const remainder = count % encodeKeys.length;
        key = encodeKeys[share] + encodeKeys[remainder];
        swapedDict[match] = key;
        count++;
      } else {
        key = encodeKeys[count];
        swapedDict[match] = key;
        count++;
      }
      dictionary[key] = match;
      return key;
    });
    return encodedText;
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
  private async translate({
    query,
    exclude,
    targetLang,
    isEncodeARBParams,
    onTranslate,
  }: {
    query: string;
    exclude: string[];
    targetLang: Language;
    isEncodeARBParams?: boolean;
    onTranslate: (encodedText: string) => Promise<string>;
  }): Promise<string> {
    try {
      // encode
      const dictionary: Record<string, string> = {};
      const encodeKeys = LanguageRepository.getEncodeKeys(targetLang);
      let encodedText: string = query;

      // Convert \n to replaceKey because Serbian does not support \n translation
      const key = encodeKeys[0];
      encodedText = query.replaceAll("\\n", key);
      dictionary[key] = "\\n";

      // Encode ARB params
      if (isEncodeARBParams) {
        console.log("isEncodeARBParams", true);
        encodedText = this.encode({
          text: encodedText,
          regex: /\{(.+?)\}/g,
          encodeKeys,
          dictionary,
        });
      }

      // Encode exclusion keywords
      for (const e of exclude) {
        encodedText = this.encode({
          text: encodedText,
          regex: new RegExp(e, "gi"),
          encodeKeys,
          dictionary,
        });
      }

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
