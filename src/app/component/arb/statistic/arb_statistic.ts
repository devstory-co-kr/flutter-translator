import { Language } from "../../language/language";

export interface APIStatistic {
  nAPI: number;
  nCache: number;
}

export interface ActionStatistic {
  create: number;
  update: number;
  delete: number;
  retain: number;
}

export interface ArbStatistic {
  [targetLanguageCode: string]: {
    filePath: string;
    language: Language;
    action: ActionStatistic;
    api: APIStatistic;
    isTranslationRequired: boolean;
  };
}
