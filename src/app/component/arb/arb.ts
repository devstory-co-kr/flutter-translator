import { LanguageCode } from "../config/config";
import { Language } from "../language/language";

export type ARB = {
  filePath: string;
  language: Language;
  data: Record<string, string>;
  keys: string[];
  values: string[];
};

export interface ARBService {
  selectTargetLanguageList({
    title,
    placeHolder,
  }: {
    title: string;
    placeHolder: string;
  }): Promise<Language[]>;
  getARBFilePathListInWorkspace(): Promise<string[]>;
  getTargetARBPathList(): Promise<string[]>;
  getExcludeLanguageList(): Language[];
  getTargetLanguageList(): Promise<Language[]>;
  getTargetLanguageCodeList(): Promise<LanguageCode[]>;
  getSourceARB(): Promise<ARB>;
  getARB(arbFilePath: string): Promise<ARB>;
  upsert(filePath: string, data: Record<string, string>): void;
  createIfNotExist(arbFilePath: string, language: Language): void;
  updateKeys(arbFilePath: string, oldKeys: string[], newKeys: string[]): void;
  deleteKeys(arbFilePath: string, deleteKeys: string[]): void;
}
