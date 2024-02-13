import * as fs from "fs";
import path from "path";
import { Dialog } from "../../../util/dialog";
import { History } from "../../history/history";
import { Language } from "../../language/language";
import { LanguageService } from "../../language/language.service";
import { TranslationCacheKey } from "../../translation/cache/translation_cache";
import { TranslationCacheRepository } from "../../translation/cache/translation_cache.repository";
import { ARB, ARBService } from "../arb";
import { APIStatistic, ARBStatistic, ActionStatistic } from "./arb_statistic";

interface InitParams {
  translationCacheRepository: TranslationCacheRepository;
  languageService: LanguageService;
  arbService: ARBService;
}

export class ARBStatisticService {
  private translationCacheRepository: TranslationCacheRepository;
  private languageService: LanguageService;
  private arbService: ARBService;

  constructor({
    translationCacheRepository,
    languageService,
    arbService,
  }: InitParams) {
    this.translationCacheRepository = translationCacheRepository;
    this.languageService = languageService;
    this.arbService = arbService;
  }

  public async showTranslationPreview({
    title,
    placeHolder,
    sourceArb,
    targetLanguages,
    excludeLanguages,
    history,
  }: {
    title?: string;
    placeHolder?: string;
    sourceArb: ARB;
    excludeLanguages: Language[];
    targetLanguages: Language[];
    history: History;
  }): Promise<Language[]> {
    const arbStatistic: ARBStatistic = await this.getArbStatistic(
      sourceArb,
      targetLanguages,
      history
    );

    const translationRequiredItems = "Translation Required";
    const noChangesItems = "No Changes";
    const excludedLanguages = "Excluded";
    const noneTarget = "No Files";

    const sectionLabelList = [
      translationRequiredItems,
      noChangesItems,
      excludedLanguages,
      noneTarget,
    ];
    const keys = Object.keys(arbStatistic);
    const selectItem = await Dialog.showSectionedPicker<string, Language>({
      sectionLabelList,
      itemList: keys,
      canPickMany: true,
      title,
      placeHolder,
      itemBuilder: (key) => {
        const s = arbStatistic[key];
        const language = s.language;
        const fileName = path.basename(s.filePath);
        const label = `${fileName} - ${language.name}`;
        const isExcluded = excludeLanguages.includes(language);
        const section = isExcluded
          ? excludedLanguages
          : s.isExist
          ? s.isTranslationRequired
            ? translationRequiredItems
            : noChangesItems
          : noneTarget;
        const picked = isExcluded
          ? false
          : s.isExist && s.isTranslationRequired;
        const detail = s.isExist
          ? s.isTranslationRequired
            ? Object.entries({
                ...s.action,
                ...s.api,
                retain: 0,
              })
                .filter(([, value]) => value > 0)
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ")
            : noChangesItems
          : undefined;
        return {
          section,
          item: {
            label,
            detail,
            picked,
          },
          data: language,
        };
      },
    });
    return selectItem ?? [];
  }

  private async getArbStatistic(
    sourceArb: ARB,
    targetLanguages: Language[],
    history: History
  ): Promise<ARBStatistic> {
    const nKeysToBeTranslated: number = sourceArb.keys.filter(
      (key) => !key.includes("@") || key === "@@locale"
    ).length;
    const arbStatistic: ARBStatistic = {};
    for (const targetLanguage of targetLanguages) {
      if (targetLanguage.languageCode === sourceArb.language.languageCode) {
        continue;
      }

      const targetARBFilePath =
        await this.languageService.getARBPathFromLanguageCode(
          targetLanguage.languageCode
        );
      const isTargetARBFileExist = fs.existsSync(targetARBFilePath);
      const { api, action } = isTargetARBFileExist
        ? this.getStatistic(
            sourceArb,
            await this.arbService.getARB(targetARBFilePath),
            history
          )
        : {
            api: this.getAPIStatistic(sourceArb, targetLanguage),
            action: {
              create: nKeysToBeTranslated,
              update: 0,
              delete: 0,
              retain: 0,
            },
          };
      const isTranslationRequired =
        action.create + action.update + action.delete > 0;

      arbStatistic[targetLanguage.languageCode] = {
        filePath: targetARBFilePath,
        language: targetLanguage,
        action,
        api,
        isTranslationRequired,
        isExist: isTargetARBFileExist,
      };
    }
    return arbStatistic;
  }

  private getStatistic(
    sourceArb: ARB,
    targetArb: ARB,
    history: History
  ): {
    action: ActionStatistic;
    api: APIStatistic;
  } {
    const api: APIStatistic = {
      nAPI: 0,
      nCache: 0,
    };
    const action: ActionStatistic = {
      create: 0,
      update: 0,
      retain: 0,
      delete: targetArb.keys.filter(
        (targetArbKey) => !sourceArb.keys.includes(targetArbKey)
      ).length,
    };
    for (const sourceArbKey of sourceArb.keys) {
      if (sourceArbKey !== "@@locale" && sourceArbKey.includes("@")) {
        continue;
      }

      const isKeyInHistory: boolean = history.keys.includes(sourceArbKey);
      const isKeyInTargetArb: boolean = targetArb.keys.includes(sourceArbKey);
      if (isKeyInHistory && isKeyInTargetArb) {
        const sourceArbValue = sourceArb.data[sourceArbKey];
        const historyArbValue = history.data[sourceArbKey];
        if (sourceArbValue === historyArbValue) {
          // retain
          action.retain += 1;
          continue;
        }
      }

      if (isKeyInTargetArb) {
        // update
        action.update += 1;
      } else {
        // create
        action.create += 1;
      }

      const isCache: boolean = this.translationCacheRepository.hasKey(
        new TranslationCacheKey({
          sourceArbValue: sourceArb.data[sourceArbKey],
          sourceLanguage: sourceArb.language,
          targetLanguage: targetArb.language,
        })
      );
      if (isCache) {
        api.nCache += 1;
      } else {
        api.nAPI += 1;
      }
    }
    return { action, api };
  }

  private getAPIStatistic(
    sourceArb: ARB,
    targetLanguage: Language
  ): APIStatistic {
    return sourceArb.keys
      .filter((key) => !key.includes("@") || key === "@@locale")
      .reduce<APIStatistic>(
        (statistic, sourceArbKey) => {
          const isCache: boolean = this.translationCacheRepository.hasKey(
            new TranslationCacheKey({
              sourceArbValue: sourceArb.data[sourceArbKey],
              sourceLanguage: sourceArb.language,
              targetLanguage,
            })
          );
          return {
            nAPI: statistic.nAPI + (isCache ? 0 : 1),
            nCache: statistic.nCache + (isCache ? 1 : 0),
          };
        },
        {
          nAPI: 0,
          nCache: 0,
        }
      );
  }
}
