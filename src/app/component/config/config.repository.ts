import {
  ARBConfig,
  Config,
  ConfigRepositoryI,
  GoogleAuthConfig,
  GoogleSheetConfig,
} from "./config";
import { ConfigDataSource } from "./config.datasource";

interface InitParams {
  configDataSource: ConfigDataSource;
}

export class ConfigRepository implements ConfigRepositoryI {
  private configDataSource: ConfigDataSource;

  private get config(): Config {
    return this.configDataSource.getConfig();
  }

  constructor({ configDataSource }: InitParams) {
    this.configDataSource = configDataSource;
  }

  public getARBConfig(): ARBConfig {
    return this.config.arbConfig;
  }
  public getGoogleAuthConfig(): GoogleAuthConfig {
    return this.config.googleAuthConfig;
  }
  public getGoogleSheetConfig(): GoogleSheetConfig {
    return this.config.googleSheetConfig;
  }
  public setARBConfig(arbConfig: Partial<ARBConfig>): void {
    this.configDataSource.setConfig({
      ...this.config,
      arbConfig: {
        ...this.config.arbConfig,
        ...arbConfig,
      },
    });
  }
  public setGoogleAuthConfig(
    googleAuthConfig: Partial<GoogleAuthConfig>
  ): void {
    this.configDataSource.setConfig({
      ...this.config,
      googleAuthConfig: {
        ...this.config.googleAuthConfig,
        ...googleAuthConfig,
      },
    });
  }
  public setGoogleSheetConfig(
    googleSheetConfig: Partial<GoogleSheetConfig>
  ): void {
    this.configDataSource.setConfig({
      ...this.config,
      googleSheetConfig: {
        ...this.config.googleSheetConfig,
        ...googleSheetConfig,
      },
    });
  }
}
