import * as fs from "fs";
import { BaseInitRequired } from "../../../util/base/base_init_required";
import { FileNotFoundException } from "../../../util/exceptions";
import { JsonParser } from "../../../util/json_parser";
import { Workspace } from "../../../util/workspace";
import { Cache, TranslationCacheKey } from "./translation_cache";

export class TranslationCacheDataSource extends BaseInitRequired {
  protected className: string = "TranslationCacheDataSource";
  private cacheFilePath: string = Workspace.getWorkspaceAppPath("cache.json");
  private cache: Cache = {};

  private get isCacheFileExist() {
    return fs.existsSync(this.cacheFilePath);
  }

  public async init(): Promise<void> {
    this.cache = this.isCacheFileExist
      ? await JsonParser.parse(this.cacheFilePath, {})
      : {};
    super.initialized();
  }

  public hasKey(cacheKey: TranslationCacheKey): boolean {
    super.checkInit();
    const {
      sourceLanguageCode,
      targetLanguageCode,
      sourceArbValueSHA1: querySHA1,
    } = cacheKey;
    return (
      this.cache[sourceLanguageCode] &&
      this.cache[sourceLanguageCode][targetLanguageCode] &&
      this.cache[sourceLanguageCode][targetLanguageCode][querySHA1]
    );
  }

  public get<T>(cacheKey: TranslationCacheKey): T | undefined {
    super.checkInit();
    const {
      sourceLanguageCode,
      targetLanguageCode,
      sourceArbValueSHA1: querySHA1,
    } = cacheKey;
    if (this.hasKey(cacheKey)) {
      return this.cache[sourceLanguageCode][targetLanguageCode][querySHA1];
    }
    return undefined;
  }

  public upsert(cacheKey: TranslationCacheKey, value: any): void {
    super.checkInit();
    // create cache file
    if (!this.isCacheFileExist) {
      if (!Workspace.createPath(this.cacheFilePath)) {
        throw new FileNotFoundException(this.cacheFilePath);
      }
    }

    const {
      sourceLanguageCode,
      targetLanguageCode,
      sourceArbValueSHA1: querySHA1,
    } = cacheKey;

    if (!this.cache[sourceLanguageCode]) {
      this.cache[sourceLanguageCode] = {};
    }

    if (!this.cache[sourceLanguageCode][targetLanguageCode]) {
      this.cache[sourceLanguageCode][targetLanguageCode] = {};
    }

    this.cache[sourceLanguageCode][targetLanguageCode][querySHA1] = value;

    fs.writeFileSync(
      this.cacheFilePath,
      JSON.stringify(
        {
          description: `This file is a Google API cache file.`,
          ...this.cache,
        },
        null,
        2
      ),
      "utf-8"
    );
  }
}
