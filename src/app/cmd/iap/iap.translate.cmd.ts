import * as vscode from "vscode";
import { ConfigService } from "../../component/config/config";
import { IapService } from "../../component/iap/iap.service";
import { MetadataService } from "../../component/metadata/metadata.service";

interface InitParams {
  configService: ConfigService;
  metadataService: MetadataService;
  iapService: IapService;
}

export class IAPTranslateCmd {
  private configService: ConfigService;
  private metadataService: MetadataService;
  private iapService: IapService;

  constructor({ configService, metadataService, iapService }: InitParams) {
    this.configService = configService;
    this.metadataService = metadataService;
    this.iapService = iapService;
  }

  public async run() {
    const platform = await this.metadataService.selectPlatform({
      placeHolder: "Select the platform to edit IAP.",
    });
    if (!platform) {return;}

    const commonLocales =
      this.iapService.getCommonLanguagesInIapFiles(platform);
    if (commonLocales.length === 0) {
      vscode.window.showWarningMessage(
        `No source language available for ${platform} IAP. Please add at least one common translation to every product in the plans.json file.`
      );
      return;
    }

    const sourceLanguageList = this.metadataService
      .getOriginSupportMetadataLanguages(platform)
      .filter((l) => commonLocales.includes(l.locale));

    const sourceMetadataLanguage = await this.metadataService.selectLanguage({
      languageList: sourceLanguageList,
      title: "Select Source Language",
      placeHolder: "Select the source language that will be the translation source.",
    });
    if (!sourceMetadataLanguage) {return;}

    const metadataExcludeLocaleList =
      this.configService.getMetadataExcludeLocaleList();

    const languages = this.metadataService
      .getSupportMetadataLanguages(platform)
      .filter((ml) => {
        return !metadataExcludeLocaleList.includes(ml.locale);
      });

    const selectedLanguages =
      this.metadataService.getMetadataLanguagesInPlatform(platform);

    const targetLanguages = await this.metadataService.selectMetadataLanguages({
      platform,
      languages,
      selectedLanguages,
      excludeLanguages: [sourceMetadataLanguage],
      title: "Select Target Languages",
      placeHolder: "Select the target languages to translate to.",
    });

    if (!targetLanguages || targetLanguages.length === 0) {return;}

    await this.iapService.translateIapFiles(
      platform,
      sourceMetadataLanguage.locale,
      targetLanguages
    );
  }
}
