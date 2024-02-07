import * as vscode from "vscode";
import { ArbService } from "../../../component/arb/arb.service";
import { LanguageCode } from "../../../component/config/config";
import { ConfigService } from "../../../component/config/config.service";
import { Language } from "../../../component/language/language";
import { LanguageService } from "../../../component/language/language.service";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";

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
    const { sourceArbFilePath, targetLanguageCodeList } = config;
    const sourceArb = await this.arbService.getArb(sourceArbFilePath);
    const supportLanguageList: Language[] =
      this.languageService.supportLanguages;
    const existLanguageList: Language[] = this.arbService.getLanguages(
      sourceArb.filePath
    );

    // select whether load language or not
    let isLoadLangauge: boolean = false;
    const missingLanguages = existLanguageList.filter(
      (l) => !targetLanguageCodeList.includes(l.languageCode)
    );
    if (missingLanguages.length > 0) {
      const isLoadLangaugeSelection = await vscode.window.showQuickPick(
        [
          {
            label: "Select directly from language list.",
            action: false,
          },
          {
            label: "Load languages from arb files.",
            action: true,
          },
        ],
        {
          title: "Please select a list of language to translate to.",
        }
      );
      if (!isLoadLangaugeSelection) {
        return;
      }
      isLoadLangauge = isLoadLangaugeSelection.action;
    }

    // select
    const [selected, exist, notExist] = [
      "Selected",
      "Exist / Not Selected",
      "Not Exist / Not Selected",
    ];
    const selectedTargetLanguageCodeList = await Dialog.showSectionedPicker<
      Language,
      LanguageCode
    >({
      canPickMany: true,
      sectionLabelList: [selected, exist, notExist],
      itemList: supportLanguageList,
      itemBuilder: (language) => {
        const isInConfig = targetLanguageCodeList.includes(
          language.languageCode
        );
        const isExist = existLanguageList.includes(language);
        const isPicked = isLoadLangauge ? isExist || isInConfig : isInConfig;
        const section = isPicked ? selected : isExist ? exist : notExist;
        return {
          section,
          item: {
            label: `${language.name} / ${language.languageCode}`,
            description: isPicked && !isInConfig ? "NEW" : "",
            picked: isPicked,
          },
          data: language.languageCode,
        };
      },
    });

    if (!selectedTargetLanguageCodeList) {
      return;
    }

    // update config
    this.configService.update({
      ...config,
      targetLanguageCodeList: selectedTargetLanguageCodeList,
    });

    Toast.i(
      `targetLanguageCodeList updated (${selectedTargetLanguageCodeList.length} selected)`
    );
  }
}
