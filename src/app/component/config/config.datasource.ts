import * as vscode from "vscode";
import { Config, ConfigDataSourceI } from "./config";

export class ConfigDataSource implements ConfigDataSourceI {
  private key: string = "config";

  // Create new every time because of cache
  private get workspace() {
    return vscode.workspace.getConfiguration("flutterTranslator");
  }

  constructor() {}

  public getConfig(): Partial<Config> {
    return this.workspace.get<Partial<Config>>(this.key) ?? {};
  }
  setConfig(config: Partial<Config>): Thenable<void> {
    return this.workspace.update(this.key, config);
  }
}
