import * as vscode from "vscode";
import { InvalidArgumentsException } from "../../util/exceptions";
import { ConfigService, LanguageCode } from "../config/config";
import { Language } from "../language/language";
import { LanguageService } from "../language/language.service";
import { ARB, ARBService } from "./arb";
import { ArbRepository } from "./arb.repository";

interface InitParams {
  languageService: LanguageService;
  configService: ConfigService;
}

export class ARBServiceImpl implements ARBService {
  private arbRepository: ArbRepository = new ArbRepository();
  private configService: ConfigService;
  private languageService: LanguageService;

  constructor({ languageService, configService }: InitParams) {
    this.languageService = languageService;
    this.configService = configService;
  }
  public async selectTargetLanguageList({
    title,
    placeHolder,
  }: {
    title: string;
    placeHolder: string;
  }): Promise<Language[]> {
    const targetLanguageList = await this.getTargetLanguageList();

    // pick items
    const pickItems = [];
    for (const language of targetLanguageList) {
      const fileName = await this.languageService.getFileNameFromLanguageCode(
        language.languageCode
      );
      pickItems.push({
        label: `${fileName} - ${language.name}`,
        picked: true,
        language,
      });
    }

    // select pick items
    const selectedItems = await vscode.window.showQuickPick(pickItems, {
      title,
      placeHolder,
      ignoreFocusOut: false,
      canPickMany: true,
    });

    return selectedItems?.map((item) => item.language) ?? [];
  }

  public getExcludeLanguageList(): Language[] {
    const excludeLanguageCodeList =
      this.configService.getARBExcludeLanguageCodeList();
    return excludeLanguageCodeList.map((languageCode) =>
      this.languageService.getLanguageByLanguageCode(languageCode)
    );
  }

  public async getSourceARB(): Promise<ARB> {
    return this.getARB(await this.configService.getSourceARBPath());
  }

  public async getTargetARBPathList(): Promise<string[]> {
    const sourceARBPath = await this.configService.getSourceARBPath();
    return this.arbRepository.getTargetARBPathList(sourceARBPath);
  }

  public async getTargetLanguageList(): Promise<Language[]> {
    const sourceARBPath = await this.configService.getSourceARBPath();
    const targetARBPathList = await this.arbRepository.getTargetARBPathList(
      sourceARBPath
    );
    const targetLanguageList: Language[] = [];
    for (const arbFilePath of targetARBPathList) {
      if (arbFilePath === sourceARBPath) {
        continue;
      }
      const language = await this.languageService.getLanguageFromARBFilePath(
        arbFilePath
      );
      targetLanguageList.push(language);
    }
    return targetLanguageList;
  }

  public async getTargetLanguageCodeList(): Promise<LanguageCode[]> {
    const targetLanguageList = await this.getTargetLanguageList();
    return targetLanguageList.map((language) => {
      return language.languageCode;
    });
  }

  public async getARB(arbFilePath: string): Promise<ARB> {
    const language = await this.languageService.getLanguageFromARBFilePath(
      arbFilePath
    );
    const data = await this.arbRepository.read(arbFilePath);
    const keys = Object.keys(data);
    const values = Object.values(data);
    return {
      filePath: arbFilePath,
      language,
      data,
      keys,
      values,
    };
  }

  public upsert(filePath: string, data: Record<string, string>): void {
    return this.arbRepository.upsert(filePath, data);
  }

  public createIfNotExist(arbFilePath: string, language: Language): void {
    return this.arbRepository.createIfNotExist(arbFilePath, language);
  }

  public async updateKeys(
    arbFilePath: string,
    oldKeys: string[],
    newKeys: string[]
  ) {
    if (oldKeys.length !== newKeys.length) {
      throw new InvalidArgumentsException(
        `The number of old keys(${oldKeys.length}) and the number of new keys(${newKeys.length}) are different.`
      );
    }

    const arbFile = await this.getARB(arbFilePath);

    // replace keys
    for (let i = 0; i < oldKeys.length; i++) {
      const oldKey = oldKeys[i];
      const newKey = newKeys[i];
      const oldKeyIndex = arbFile.keys.indexOf(oldKey);
      if (oldKeyIndex === -1) {
        // skip if there is no key in arb file
        continue;
      }
      arbFile.keys[oldKeyIndex] = newKey;
    }

    const data = arbFile.keys.reduce<Record<string, string>>(
      (prev, key, index) => {
        prev[key] = arbFile.values[index];
        return prev;
      },
      {}
    );

    this.upsert(arbFilePath, data);
  }

  public async deleteKeys(arbFilePath: string, deleteKeys: string[]) {
    const arbFile = await this.getARB(arbFilePath);
    for (const deleteKey of deleteKeys) {
      const keyIndex = arbFile.keys.indexOf(deleteKey);
      if (keyIndex === -1) {
        // skip if there is no key in arb file
        continue;
      }

      // delete key
      delete arbFile.data[deleteKey];
      this.upsert(arbFilePath, arbFile.data);
    }
  }
}
