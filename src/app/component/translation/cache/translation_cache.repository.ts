import { TranslationCacheKey } from "./translation_cache";
import { TranslationCacheDataSource } from "./translation_cache.datasource";

interface InitParams {
  cacheDataSource: TranslationCacheDataSource;
}

export class TranslationCacheRepository {
  private cacheDataSource: TranslationCacheDataSource;

  constructor({ cacheDataSource }: InitParams) {
    this.cacheDataSource = cacheDataSource;
  }

  public hasKey(cacheKey: TranslationCacheKey): boolean {
    return this.cacheDataSource.hasKey(cacheKey);
  }

  public get<T>(cacheKey: TranslationCacheKey): T | undefined {
    return this.cacheDataSource.get(cacheKey);
  }

  public upsert(cacheKey: TranslationCacheKey, value: any): void {
    return this.cacheDataSource.upsert(cacheKey, value);
  }
}
