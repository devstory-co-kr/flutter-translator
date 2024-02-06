import path from "path";
import * as vscode from "vscode";
import { ArbService } from "../../../component/arb/arb.service";
import { LanguageCode } from "../../../component/config/config";
import { ConfigService } from "../../../component/config/config.service";
import { LanguageService } from "../../../component/language/language.service";
import { Toast } from "../../../util/toast";

enum Action {
  select = "Select",
  load = "Load",
}

interface InitParams {
  arbService: ArbService;
  configService: ConfigService;
  languageService: LanguageService;
}

export class ArbConfigureTargetLanguageCodeCmd {
  private arbService: ArbService;
  private configService: ConfigService;
  private languageService: LanguageService;

  constructor({ arbService, configService, languageService }: InitParams) {
    (this.arbService = arbService), (this.configService = configService);
    this.languageService = languageService;
  }

  public async run() {
    const config = this.configService.config;
    const sourceArb = await this.arbService.getArb(config.sourceArbFilePath);

    // select action
    const action: Action | undefined = await this.selectAction();
    if (!action) {
      return;
    }

    let newLanguageCodeList: LanguageCode[] | undefined;
    switch (action) {
      case Action.select:
        newLanguageCodeList = await this.languageService.selectLanguageCodeList(
          sourceArb.language,
          (languageCode) => config.targetLanguageCodeList.includes(languageCode)
        );
        if (!newLanguageCodeList) {
          return;
        }
        break;
      case Action.load:
        newLanguageCodeList = await this.loadLanguageCode(sourceArb.filePath);
        if (newLanguageCodeList.length === 0) {
          const directory = path.dirname(sourceArb.filePath);
          Toast.i(
            `There are no arb files except sourceArb in the ${directory}`
          );
          return;
        }
        break;
    }

    // update config
    this.configService.update({
      ...config,
      targetLanguageCodeList: newLanguageCodeList,
    });

    Toast.i(
      `targetLanguageCodeList updated (${newLanguageCodeList.length} selected)`
    );
  }

  /**
   * Select action
   */
  private async selectAction(): Promise<Action | undefined> {
    const select = await vscode.window.showQuickPick(
      [
        {
          label: "Select directly from language list.",
          action: Action.select.toString(),
        },
        {
          label: "Load languages from arb files.",
          action: Action.load.toString(),
        },
      ],
      {
        title: "Please select a list of language to translate to.",
      }
    );
    if (!select) {
      return undefined;
    }
    return <Action>select.action;
  }

  /**
   * Get list of language codes from arb files
   * @param sourceArbFilePath
   */
  private async loadLanguageCode(
    sourceArbFilePath: string
  ): Promise<LanguageCode[]> {
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
