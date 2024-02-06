import * as vscode from "vscode";
import { BaseInitRequired } from "../../util/base/base_init_required";
import { Config, ConfigParams } from "./config";

export class ConfigRepository extends BaseInitRequired {
  public className: string = "ConfigRepository";

  // Create new every time because of cache
  private get _workspace() {
    return vscode.workspace.getConfiguration("flutterTranslator");
  }

  private _key: string = "config";

  private defaultConfig: Config = {
    sourceArbFilePath: "",
    googleAPIKey: "",
    targetLanguageCodeList: [],
  };
  private config: Config = this.defaultConfig;

  public async init(): Promise<void> {
    this.config = {
      ...this.defaultConfig,
      ...this._workspace.get<Config>(this._key),
    };
    super.initialized();
  }

  public get(): Config {
    super.checkInit();
    return this.config;
  }

  public set({
    arbFilePrefix,
    customArbFileName,
    sourceArbFilePath,
    googleAPIKey,
    googleSheet,
    targetLanguageCodeList,
  }: ConfigParams): Thenable<void> {
    super.checkInit();
    this.config = <Config>{
      arbFilePrefix: arbFilePrefix ?? this.config.arbFilePrefix,
      customArbFileName: customArbFileName ?? this.config.customArbFileName,
      sourceArbFilePath: sourceArbFilePath ?? this.config.sourceArbFilePath,
      googleAPIKey: googleAPIKey ?? this.config.googleAPIKey,
      googleSheet: googleSheet ?? this.config.googleSheet,
      targetLanguageCodeList:
        targetLanguageCodeList ?? this.config.targetLanguageCodeList,
    };
    return this._workspace.update(this._key, this.config);
  }
}
