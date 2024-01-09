import path from "path";
import * as vscode from "vscode";
import { ArbService } from "../arb/arb.service";
import { LanguageCode } from "../config/config";
import { ConfigService } from "../config/config.service";
import { Language } from "../language/language";
import { LanguageService } from "../language/language.service";
import { Toast } from "../util/toast";

interface InitParams {
  arbService: ArbService;
  configService: ConfigService;
  languageService: LanguageService;
}

export class SelectTargetLanguageCode {
  private arbService: ArbService;
  private configService: ConfigService;
  private languageService: LanguageService;

  constructor({ arbService, configService, languageService }: InitParams) {
    (this.arbService = arbService), (this.configService = configService);
    this.languageService = languageService;
  }

  public async run() {
    const config = this.configService.config;
    const sourceArb = await this.arbService.get(config.sourceArbFilePath);

    // support language list
    const supportLanguageList: Language[] = this.getSupportLanguageList(
      sourceArb.language
    );

    // List of languages that will be selected by default
    const selectedLanguageCodeList: LanguageCode[] =
      await this.getDefaultTargetLanguageCode(
        config.sourceArbFilePath,
        config.targetLanguageCodeList
      );

    if (supportLanguageList.length === 0) {
      const sourceArbName = path.basename(config.sourceArbFilePath);
      const arbPath = path.dirname(config.sourceArbFilePath);
      return Toast.i(
        `There are no arb files in path "${arbPath}". (Excluding ${sourceArbName}, which is the source arb file)`
      );
    }

    // pick items
    const pickItems: vscode.QuickPickItem[] = supportLanguageList.map(
      (language) => {
        const picked = selectedLanguageCodeList.includes(language.languageCode);
        return {
          label: language.name,
          description: language.languageCode,
          picked,
        };
      }
    );

    // select pick items
    const selectedItems = await vscode.window.showQuickPick(pickItems, {
      placeHolder: `Please select the language code of the language you wish to translate`,
      canPickMany: true,
    });

    if (!selectedItems) {
      return;
    }

    const targetLanguageCodeList = selectedItems?.map(
      (item) => item.description!
    );

    // update config
    this.configService.update({
      ...config,
      targetLanguageCodeList,
    });

    Toast.i(
      `targetLanguageCodeList updated (${targetLanguageCodeList.length} selected)`
    );
  }

  /**
   * Get list of supported language codes excluding languageCode of source arb
   * @param sourceArbLanguage
   * @param selectedTargetLanguageCodeList
   * @returns
   */
  private getSupportLanguageList(sourceArbLanguage: Language): Language[] {
    return this.languageService.supportLanguages.reduce<Language[]>(
      (prev, curr) => {
        if (curr !== sourceArbLanguage) {
          prev.push(curr);
        }
        return prev;
      },
      []
    );
  }

  /**
   * Get list of language codes
   * @param sourceArbFilePath
   * @param configTargetLanguageCodeList
   */
  private async getDefaultTargetLanguageCode(
    sourceArbFilePath: string,
    configTargetLanguageCodeList: LanguageCode[]
  ): Promise<LanguageCode[]> {
    const languageCodesFromArbFiles: LanguageCode[] =
      await this.selectTargetLanguageCodeWithArbFiles(sourceArbFilePath);

    const notAddedLanguageCodesFromArbFiles = languageCodesFromArbFiles.filter(
      (langCode) => {
        return !configTargetLanguageCodeList.includes(langCode);
      }
    );
    const totalNotAdded = notAddedLanguageCodesFromArbFiles.length;
    if (totalNotAdded > 0) {
      const yes = "yes";
      const userAnswer = await vscode.window.showQuickPick(
        <vscode.QuickPickItem[]>[{ label: yes }, { label: "no" }],
        {
          placeHolder: `Found ${totalNotAdded} arb files not added with targetLanguageCode. Do you want to add this files?`,
          canPickMany: false,
        }
      );
      if (userAnswer?.label === yes) {
        return [
          ...configTargetLanguageCodeList,
          ...notAddedLanguageCodesFromArbFiles,
        ];
      }
    }
    return configTargetLanguageCodeList;
  }

  /**
   * Get list of language codes from arb files excluding languageCode of source arb
   * @param sourceArbFilePath
   */
  private selectTargetLanguageCodeWithArbFiles(
    sourceArbFilePath: string
  ): LanguageCode[] {
    const arbFiles = this.arbService.getArbFiles(sourceArbFilePath);
    return arbFiles.reduce<LanguageCode[]>((result, arbFile) => {
      if (arbFile !== sourceArbFilePath) {
        const languageCode =
          this.languageService.getLanguageCodeFromArbFilePath(arbFile);
        result.push(languageCode);
      }
      return result;
    }, []);
  }
}
