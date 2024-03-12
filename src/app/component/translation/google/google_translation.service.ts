import * as vscode from "vscode";
import { ConfigService } from "../../config/config";
import { Language } from "../../language/language";
import { TranslationCacheKey } from "../cache/translation_cache";
import { TranslationCacheRepository } from "../cache/translation_cache.repository";
import { TranslationResult, TranslationType } from "../translation";
import { TranslationRepository } from "../translation.repository";
import {
  FreeTranslateServiceParams,
  PaidTranslateServiceParams,
  TranslationService,
} from "../translation.service";

interface InitParams {
  translationCacheRepository: TranslationCacheRepository;
  translationRepository: TranslationRepository;
  configService: ConfigService;
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
  private configService: ConfigService;

  constructor({
    translationCacheRepository,
    translationRepository,
    configService,
  }: InitParams) {
    this.translationCacheRepository = translationCacheRepository;
    this.translationRepository = translationRepository;
    this.configService = configService;
  }

  /**
   * Select translation type
   * @throws APIKeyRequiredException
   */
  public async selectTranslationType(): Promise<TranslationType | undefined> {
    // select translation type
    const items: vscode.QuickPickItem[] = [
      {
        label: TranslationType.free,
        description: "Limit to approximately 100 requests per hour",
      },
      { label: TranslationType.paid, description: "Google API key required" },
    ];
    const selectedItem = await vscode.window.showQuickPick(items, {
      title: "Please select a translation method.",
      canPickMany: false,
      ignoreFocusOut: false,
    });
    if (!selectedItem) {
      return undefined;
    }

    const type = <TranslationType>selectedItem.label;
    return type;
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
  private async paidTranslate({
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
   * Translate
   */
  public async translate({
    queries,
    sourceLang,
    targetLang,
  }: {
    queries: string[];
    sourceLang: Language;
    targetLang: Language;
  }): Promise<TranslationResult> {
    return this.freeTranslate({
      queries: queries,
      sourceLang: sourceLang,
      targetLang: targetLang,
    });

    // Paid translation deprecased
    // switch (type) {
    //   case TranslationType.paid:
    //     return this.paidTranslate({
    //       apiKey: await this.configService.getGoogleAuthAPIKey(),
    //       queries: queries,
    //       sourceLang: sourceLang,
    //       targetLang: targetLang,
    //     });
    //   case TranslationType.free:
    //     return this.freeTranslate({
    //       queries: queries,
    //       sourceLang: sourceLang,
    //       targetLang: targetLang,
    //     });
    // }
  }

  /**
   * Translate without charge
   * @param queries
   * @param sourceLang
   * @param targetLang
   * @returns Promise<string[] | undefined>
   * @throws TranslationFailureException
   */
  private async freeTranslate({
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
        if (query === "") {
          return query;
        }

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
    // Logger.l(`Total translate request : ${nRequest} (cache : ${nCache})`);
    return {
      data: results,
      nAPICall: nRequest,
      nCache,
    };
  }
}
