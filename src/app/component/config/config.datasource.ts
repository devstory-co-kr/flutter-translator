import * as vscode from "vscode";
import { Config, ConfigDataSourceI } from "./config";

export class ConfigDataSource implements ConfigDataSourceI {
  private key: string = "config";

  // Create new every time because of cache
  private get workspace() {
    return vscode.workspace.getConfiguration("flutterTranslator");
  }

  constructor() {}

  getConfig(): Config {
    return (
      this.workspace.get<Config>(this.key) ?? {
        arbConfig: {
          sourcePath: "",
          exclude: [],
          prefix: undefined,
          custom: {},
        },
        googleAuthConfig: {
          apiKey: "",
          credential: "",
        },
        googleSheetConfig: {
          id: "",
          name: "",
          exclude: [],
        },
      }
    );
  }
  setConfig(config: Config): void {
    this.workspace.update(this.key, config);
  }
}
