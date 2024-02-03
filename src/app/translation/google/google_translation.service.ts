import { Language } from "../../language/language";
import { Logger } from "../../util/logger";
import { TranslationCacheKey } from "../cache/translation_cache";
import { TranslationCacheRepository } from "../cache/translation_cache.repository";
import { TranslationResult } from "../translation";
import { TranslationRepository } from "../translation.repository";
import {
  FreeTranslateServiceParams,
  PaidTranslateServiceParams,
  TranslationService,
} from "../translation.service";

interface InitParams {
  translationCacheRepository: TranslationCacheRepository;
  translationRepository: TranslationRepository;
}
interface TranslateParams {
  queries: string[];
  sourceLang: Language;
  targetLang: Language;
  onTranslate: (query: string) => Promise<string>;
}

export class GoogleTranslationService implements TranslationService {
  private translationCacheRepository: TranslationCacheRepository;
  private translationRepository: TranslationRepository;

  constructor({
    translationCacheRepository,
    translationRepository,
  }: InitParams) {
    this.translationCacheRepository = translationCacheRepository;
    this.translationRepository = translationRepository;
  }

  public getTranslateWebsiteUrl(
    sourceLanguage: Language,
    targetLanguage: Language,
    text: string
  ): string {
    const sl = sourceLanguage.gt;
    const tl = targetLanguage.gt;
    return `https://translate.google.co.kr/?sl=${sl}&tl=${tl}&text=${text}&op=translate`;
  }

  /**
   * Translate with payment
   * @param apiKey
   * @param queries
   * @param sourceLang
   * @param targetLang
   * @returns Promise<string[] | undefined>
   * @throws APIKeyRequiredException, TranslationFailureException
   */
  public async paidTranslate({
    apiKey,
    queries,
    sourceLang,
    targetLang,
  }: PaidTranslateServiceParams): Promise<TranslationResult> {
    return this.checkCache({
      queries: queries,
      sourceLang: sourceLang,
      targetLang: targetLang,
      onTranslate: async (query) => {
        return this.translationRepository.paidTranslate({
          apiKey,
          query,
          sourceLang,
          targetLang,
        });
      },
    });
  }

  /**
   * Translate without charge
   * @param queries
   * @param sourceLang
   * @param targetLang
   * @returns Promise<string[] | undefined>
   * @throws TranslationFailureException
   */
  async freeTranslate({
    queries,
    sourceLang,
    targetLang,
  }: FreeTranslateServiceParams): Promise<TranslationResult> {
    return this.checkCache({
      queries: queries,
      sourceLang: sourceLang,
      targetLang: targetLang,
      onTranslate: async (query) => {
        return this.translationRepository.freeTranslate({
          query,
          sourceLang,
          targetLang,
        });
      },
    });
  }

  /**
   * If a translation cache exists, return the cache, otherwise call the onTranslate function
   * @param TranslateParams
   * @returns
   */
  private async checkCache({
    queries,
    sourceLang,
    targetLang,
    onTranslate,
  }: TranslateParams) {
    let nCache = 0;
    let nRequest = 0;
    const results = await Promise.all(
      queries.map(async (query) => {
        const cacheKey = new TranslationCacheKey({
          sourceArbValue: query,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang,
        });
        const cacheValue =
          this.translationCacheRepository.get<string>(cacheKey);
        if (cacheValue) {
          // return cache
          nCache += 1;
          return cacheValue;
        } else {
          // request API
          nRequest += 1;
          const translatedText = await onTranslate(query);

          // update cache
          this.translationCacheRepository.upsert(cacheKey, translatedText);
          return translatedText;
        }
      })
    );
    Logger.l(`Total translate request : ${nRequest} (cache : ${nCache})`);
    return {
      data: results,
      nAPICall: nRequest,
      nCache,
    };
  }
}
