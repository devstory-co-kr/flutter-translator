import * as he from "he";
import { Constant } from "../../../util/constant";
import { TranslationFailureException } from "../../../util/exceptions";
import { Logger } from "../../../util/logger";
import Statistic from "../../../util/statistic";
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
    isEncode,
    nEncoded,
    encodeKeys,
    dictionary,
  }: {
    text: string;
    regex: RegExp;
    isEncode: boolean;
    nEncoded: { value: number };
    encodeKeys: string[];
    dictionary: Record<string, string>;
  }): string {
    let count = Object.keys(dictionary).length;
    const swapedDict = Object.fromEntries(
      Object.entries(dictionary).map((a) => a.reverse())
    );
    const encodedText = text.replace(regex, (match, _) => {
      nEncoded.value += 1;
      if (!isEncode) {
        // Not encode
        dictionary[match] = match;
        return match;
      }

      let key: string;
      if (swapedDict[match]) {
        key = swapedDict[match];
      } else if (count >= encodeKeys.length) {
        const share = Math.floor(count / encodeKeys.length);
        const remainder = count % encodeKeys.length;
        key = `${encodeKeys[share]}_${encodeKeys[remainder]}`;
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
   */
  private async translate({
    query,
    exclude,
    isEncodeARBParams,
    onTranslate,
  }: {
    query: string;
    exclude: string[];
    isEncodeARBParams?: boolean;
    onTranslate: (encodedText: string) => Promise<string>;
  }): Promise<string> {
    try {
      let result: {
        encodedText: string;
        translatedText: string;
        decodedText: string;
        encodeScore: number;
        translationScore: number;
        dictionary: Record<string, string>;
      } = {
        encodedText: "",
        translatedText: "",
        decodedText: "",
        encodeScore: 0,
        translationScore: 0,
        dictionary: {},
      };
      const encodekeysList = [Constant.emojis, Constant.keycaps, []];
      for (let i = 0; i < encodekeysList.length; i++) {
        const encodeKeys = encodekeysList[i];
        const isEncode = encodeKeys.length > 0;
        const dictionary: Record<string, string> = {};
        let encodedText: string = query;
        let nEncoded = { value: 0 };

        // Encode line break
        encodedText = this.encode({
          text: encodedText,
          regex: /\n/g,
          isEncode,
          nEncoded,
          encodeKeys,
          dictionary,
        });

        // Encode ARB params
        if (isEncodeARBParams) {
          encodedText = this.encode({
            text: encodedText,
            regex: /\{(.+?)\}/g,
            isEncode,
            nEncoded,
            encodeKeys,
            dictionary,
          });
        }

        // Encode exclusion keywords
        for (const e of exclude) {
          encodedText = this.encode({
            text: encodedText,
            regex: new RegExp(e, "gi"),
            isEncode,
            nEncoded,
            encodeKeys,
            dictionary,
          });
        }

        // translate
        let translatedText = await onTranslate(encodedText);

        // decode
        const decodedText = this.decode(dictionary, translatedText);

        // evaluate
        const nRemains = Object.keys(dictionary).reduce((prev, curr) => {
          return prev + translatedText.split(curr).length - 1;
        }, 0);
        const encodeScore =
          nEncoded.value === 0
            ? 1
            : Statistic.convertToOneHotScore(nRemains / nEncoded.value);
        const translationScore = Statistic.getTranslationScore(
          query,
          decodedText
        );
        const finalScore = encodeScore * 2 + translationScore;
        const resultFinalScore =
          result.encodeScore * 2 + result.translationScore;

        const isFirst = i === 0;
        const isEncodePerfect = encodeScore === 1;
        const isTranslationPerfect = translationScore === 1;
        const isPerfect = isEncodePerfect && isTranslationPerfect;
        const isBetter = finalScore > resultFinalScore;
        if (isFirst || isBetter || isPerfect) {
          result = {
            encodedText,
            translatedText,
            decodedText,
            encodeScore,
            translationScore,
            dictionary,
          };
        }

        Logger.l(
          `🐾 [Not perfect translation]\nfinalScore=${finalScore}\nencodeScore=${
            result.encodeScore
          }\ntranslationScore=${
            result.translationScore
          }\nencode: ${encodedText.replaceAll(
            "\n",
            "\\n"
          )}\ndecode: ${decodedText.replaceAll("\n", "\\n")}`
        );
        if (isPerfect) {
          break;
        }
      }
      return result.decodedText;
    } catch (e: any) {
      throw new TranslationFailureException(
        e.response?.data.error.message ?? `Translation failed : ${e.message}`
      );
    }
  }
}
