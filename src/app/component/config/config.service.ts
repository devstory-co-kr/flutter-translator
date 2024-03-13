import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import {
  GoogleAuthRequiredException,
  SourceARBPathRequiredException,
} from "../../util/exceptions";
import { Link } from "../../util/link";
import { Workspace } from "../../util/workspace";
import { CustomARBFileName, Language } from "../language/language";
import { LanguageRepository } from "../language/language.repository";
import { XcodeProjectName } from "../xcode/xcode";
import {
  ARBFileName,
  ConfigService,
  FilePath,
  GoogleAPIKey,
  LanguageCode,
} from "./config";
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

  public async setARBCustom(
    custom: Record<LanguageCode, ARBFileName>
  ): Promise<void> {
    const arbConfig = this.configRepository.getARBConfig();
    return this.configRepository.setARBConfig({
      ...arbConfig,
      custom: {
        ...arbConfig.custom,
        ...custom,
      },
    });
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

      await this.configRepository.setGoogleAuthConfig({
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

      await this.configRepository.setGoogleAuthConfig({
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
      const arbPathList = await Workspace.getARBFilePathListInWorkspace();
      const selection = await vscode.window.showQuickPick(
        arbPathList.map((arbPath: string) => ({
          label: arbPath,
        })),
        {
          title: "Select source ARB file path",
          placeHolder: "Please select the source ARB file.",
          ignoreFocusOut: true,
        }
      );
      if (!selection) {
        throw new SourceARBPathRequiredException();
      }
      sourceARBPath = selection.label;

      const intl = "intl_";
      await this.configRepository.setARBConfig({
        sourcePath: sourceARBPath,
        prefix: path.basename(sourceARBPath).startsWith(intl) ? intl : "",
      });
    }
    return sourceARBPath;
  }

  public getCustomXcodeProjectLanguageCode(): Record<string, string> {
    return this.configRepository.getXcodeConfig().projectLanguageCode;
  }

  public async setCustomXcodeProjectLanguage(
    projectName: XcodeProjectName
  ): Promise<Language | undefined> {
    const { projectLanguageCode } = this.configRepository.getXcodeConfig();
    const languageCode: LanguageCode | undefined =
      projectLanguageCode[projectName];
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
      await this.configRepository.setXcodeConfig({
        projectLanguageCode: {
          ...projectLanguageCode,
          [projectName]: language.languageCode,
        },
      });
    }
    return language;
  }

  public getTranslationExclude(): string[] {
    const { exclude } = this.configRepository.getTranslationConfig();
    return exclude;
  }

  public async setTranslationExclude(exclude: string[]): Promise<void> {
    const translationConfig = this.configRepository.getTranslationConfig();
    await this.configRepository.setTranslationConfig({
      ...translationConfig,
      exclude,
    });
  }
}
