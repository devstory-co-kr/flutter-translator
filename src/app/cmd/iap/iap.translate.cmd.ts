import * as vscode from "vscode";
import { ConfigService } from "../../component/config/config";
import { IapTranslateTarget } from "../../component/iap/iap";
import { IapService } from "../../component/iap/iap.service";
import { MetadataPlatform } from "../../component/metadata/metadata";
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

    let target: IapTranslateTarget;
    if (platform === MetadataPlatform.ios) {
      const picked = await vscode.window.showQuickPick(
        [
          { label: "Plans", description: "plans.json and other plan files", target: IapTranslateTarget.plans },
          { label: "Subscription Groups", description: "subscription_groups.json", target: IapTranslateTarget.subscriptionGroups },
        ],
        { title: "Select IAP Target", placeHolder: "Select what to translate." }
      );
      if (!picked) {return;}
      target = picked.target;
    } else {
      target = IapTranslateTarget.plans;
    }

    const commonLocales = this.iapService.getCommonLanguagesInIapFiles(
      platform,
      target
    );
    if (commonLocales.length === 0) {
      const label =
        target === IapTranslateTarget.subscriptionGroups
          ? "subscription_groups.json"
          : "plans.json";
      vscode.window.showWarningMessage(
        `No source language available for ${platform} IAP (${label}). Please add at least one localization entry before translating.`
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
      .filter((ml) => !metadataExcludeLocaleList.includes(ml.locale));

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
      target,
      sourceMetadataLanguage.locale,
      targetLanguages
    );

    const answer = await vscode.window.showQuickPick(
      [
        { label: "Run IAP Check", run: true },
        { label: "Skip", run: false },
      ],
      { title: "IAP translation complete.", placeHolder: "Would you like to run IAP Check now?" }
    );
    if (answer?.run) {
      this.iapService.checkIapFiles();
    }
  }
}
