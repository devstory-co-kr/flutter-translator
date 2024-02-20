import * as fs from "fs";
import * as vscode from "vscode";
import {
  GoogleAuthRequiredException,
  SourceARBPathRequiredException,
} from "../../util/exceptions";
import { Link } from "../../util/link";
import { CustomARBFileName, Language } from "../language/language";
import { LanguageRepository } from "../language/language.repository";
import { XcodeProjectName } from "../xcode/xcode";
import { ConfigService, FilePath, GoogleAPIKey, LanguageCode } from "./config";
import { ConfigRepository } from "./config.repository";

interface InitParams {
  configRepository: ConfigRepository;
}

export class ConfigServiceImpl implements ConfigService {
  private configRepository: ConfigRepository;
  constructor({ configRepository }: InitParams) {
    this.configRepository = configRepository;
  }

  public getMetadataExcludeLocaleList(): string[] {
    const { exclude } = this.configRepository.getMetadataConfig();
    return exclude;
  }

  public getChangelogExcludeLocaleList(): string[] {
    const { exclude } = this.configRepository.getChangelogConfig();
    return exclude;
  }

  public getARBExcludeLanguageCodeList(): string[] {
    const { exclude } = this.configRepository.getARBConfig();
    return exclude;
  }
  public async getGoogleAuthCredential(): Promise<FilePath> {
    const { credential } = this.configRepository.getGoogleAuthConfig();
    let credentialPath: string | undefined = credential;
    if (!credentialPath) {
      vscode.window
        .showInformationMessage(
          "Please refer to the link for information on how to download Google credentials.",
          "Show Link"
        )
        .then((value) => {
          if (value === "Show Link") {
            Link.show(
              "https://developers.google.com/workspace/guides/create-credentials?#service-account"
            );
          }
        });
      credentialPath = await vscode.window.showInputBox({
        title: "Google Credential",
        placeHolder:
          "Please enter the absolute path of google credential file.",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value) {
            return "Credential path required";
          } else if (!fs.existsSync(value)) {
            return "File not exist";
          }
        },
      });
      if (!credentialPath) {
        throw new GoogleAuthRequiredException(
          `Google credential path required.`
        );
      }

      this.configRepository.setGoogleAuthConfig({
        credential: credentialPath,
      });
    }
    return credentialPath;
  }
  public async getGoogleAuthAPIKey(): Promise<GoogleAPIKey> {
    const { apiKey } = this.configRepository.getGoogleAuthConfig();
    let googleAPIKey: string | undefined = apiKey;
    if (!googleAPIKey) {
      vscode.window
        .showInformationMessage(
          "Please refer to the document and proceed with the API Key issuance process.",
          "Open document"
        )
        .then((value) => {
          if (value === "Open document") {
            Link.show("https://cloud.google.com/translate/docs/setup");
          }
        });

      googleAPIKey = await vscode.window.showInputBox({
        title: "Google API Key",
        placeHolder: "Please enter the google API key.",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value) {
            return "API key required";
          } else if (!fs.existsSync(value)) {
            return `Google credential file not exist in ${value}`;
          }
        },
      });
      if (!googleAPIKey) {
        throw new GoogleAuthRequiredException(`Google API key required.`);
      }

      this.configRepository.setGoogleAuthConfig({
        apiKey: googleAPIKey,
      });
    }
    return googleAPIKey;
  }
  public async getARBPrefix(): Promise<string | undefined> {
    const { prefix } = await this.configRepository.getARBConfig();
    return prefix;
  }
  public async getCustomARBFileName(): Promise<CustomARBFileName> {
    const { custom } = await this.configRepository.getARBConfig();
    return {
      data: custom,
      languageCodeList: Object.keys(custom),
      arbFileNameList: Object.values(custom),
    };
  }

  public async getSourceARBPath(): Promise<string> {
    const { sourcePath } = this.configRepository.getARBConfig();
    let sourceARBPath: string | undefined = sourcePath;
    if (!sourceARBPath) {
      sourceARBPath = await vscode.window.showInputBox({
        title: "Source ARB File Path",
        placeHolder: "Please enter the source ARB file absolute path.",
        ignoreFocusOut: true,
        validateInput: (value) => {
          if (!value) {
            return "Source ARB path required";
          } else if (!fs.existsSync(value)) {
            return `Source ARB file not exist in ${value}`;
          }
        },
      });
      if (!sourceARBPath) {
        throw new SourceARBPathRequiredException();
      }

      this.configRepository.setARBConfig({
        sourcePath: sourceARBPath,
      });
    }
    return sourceARBPath;
  }

  public getCustomXcodeProjectLanguageCode(): Record<string, string> {
    return this.configRepository.getXcodeConfig().custom;
  }

  public async setCustomXcodeProjectLanguage(
    projectName: XcodeProjectName
  ): Promise<Language | undefined> {
    const { custom } = this.configRepository.getXcodeConfig();
    const languageCode: LanguageCode | undefined = custom[projectName];
    let language = LanguageRepository.supportLanguages.find((language) => {
      return language.languageCode === languageCode;
    });
    if (language) {
      return language;
    }

    // select language
    const selection = await vscode.window.showQuickPick(
      LanguageRepository.supportLanguages.map((l) => ({
        label: `${l.name} (${l.languageCode})`,
        language: l,
      })),
      {
        title: `Select ${projectName} language`,
        placeHolder: `Please select the language of ${projectName}.`,
        canPickMany: false,
        ignoreFocusOut: true,
      }
    );
    language = selection?.language;
    if (language) {
      // update xcode config
      this.configRepository.setXcodeConfig({
        custom: { ...custom, [projectName]: language.languageCode },
      });
    }
    return language;
  }
}
