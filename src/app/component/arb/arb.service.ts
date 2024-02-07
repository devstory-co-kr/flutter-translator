import * as vscode from "vscode";
import {
  InvalidArgumentsException,
  SourceArbFilePathRequiredException,
  WorkspaceNotFoundException,
} from "../../util/exceptions";
import { Language } from "../language/language";
import { LanguageService } from "../language/language.service";
import { Arb } from "./arb";
import { ArbRepository } from "./arb.repository";

interface InitParams {
  languageService: LanguageService;
}

export class ArbService {
  private arbRepository: ArbRepository = new ArbRepository();
  private languageService: LanguageService;

  constructor({ languageService }: InitParams) {
    this.languageService = languageService;
  }

  /**
   * Get arb file path list in workspace
   * @returns
   */
  public async getArbFilePathListInWorkspace(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new WorkspaceNotFoundException();
    }

    // search .arb file
    const arbFilesInFolders: vscode.Uri[][] = await Promise.all(
      workspaceFolders.map((folder) =>
        vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, "**/*.arb")
        )
      )
    );
    const arbFiles: vscode.Uri[] = ([] as vscode.Uri[]).concat(
      ...arbFilesInFolders
    );
    return arbFiles.map((file) => file.path);
  }

  /**
   * Return all files in the same folder as source arb file
   * @param sourceArbFilePath
   * @returns
   * @throws FileNotFoundException
   */
  public getArbFilePathList(sourceArbFilePath: string): string[] {
    return this.arbRepository.getArbFilePathList(sourceArbFilePath);
  }

  /**
   * Get language list in source arb file directory
   * @param sourceArbFilePath
   * @returns
   */
  public getLanguages(sourceArbFilePath: string): Language[] {
    const arbFilePathList = this.getArbFilePathList(sourceArbFilePath);
    return arbFilePathList.map((arbFilePath) => {
      return this.languageService.getLanguageFromArbFilePath(arbFilePath);
    });
  }

  /**
   * Get arb from arbFilePath.
   * @param arbFilePath
   * @returns Promise<Arb>
   * @throws FileNotFoundException
   */
  public async getArb(arbFilePath: string): Promise<Arb> {
    if (!arbFilePath) {
      throw new SourceArbFilePathRequiredException();
    }
    const language =
      this.languageService.getLanguageFromArbFilePath(arbFilePath);
    const data = await this.arbRepository.read(arbFilePath);
    return {
      filePath: arbFilePath,
      language: language,
      data: data,
      keys: Object.keys(data),
      values: Object.values(data),
    };
  }

  /**
   * If the arb file does not exist, create it and then update it.
   * @param arb
   */
  public upsert(filePath: string, data: Record<string, string>) {
    this.arbRepository.upsert(filePath, data);
  }

  public createIfNotExist(arbFilePath: string, language: Language) {
    this.arbRepository.createIfNotExist(arbFilePath, language);
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

    const arbFile = await this.getArb(arbFilePath);

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
    const arbFile = await this.getArb(arbFilePath);
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
