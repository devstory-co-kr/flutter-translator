import {
  ARBConfig,
  Config,
  ConfigRepositoryI,
  GoogleAuthConfig,
  GoogleSheetConfig,
  XcodeConfig,
} from "./config";
import { ConfigDataSource } from "./config.datasource";

interface InitParams {
  configDataSource: ConfigDataSource;
}

export class ConfigRepository implements ConfigRepositoryI {
  private configDataSource: ConfigDataSource;

  private get config(): Partial<Config> {
    return this.configDataSource.getConfig();
  }

  constructor({ configDataSource }: InitParams) {
    this.configDataSource = configDataSource;
  }
  public getARBConfig(): ARBConfig {
    return (
      this.config.arbConfig ?? {
        sourcePath: "",
        exclude: [],
        prefix: undefined,
        custom: {},
      }
    );
  }
  public setARBConfig(arbConfig: Partial<ARBConfig>): void {
    this.configDataSource.setConfig({
      ...this.config,
      arbConfig: {
        ...this.getARBConfig(),
        ...arbConfig,
      },
    });
  }

  public getGoogleAuthConfig(): GoogleAuthConfig {
    return (
      this.config.googleAuthConfig ?? {
        apiKey: "",
        credential: "",
      }
    );
  }
  public setGoogleAuthConfig(
    googleAuthConfig: Partial<GoogleAuthConfig>
  ): void {
    this.configDataSource.setConfig({
      ...this.config,
      googleAuthConfig: {
        ...this.getGoogleAuthConfig(),
        ...googleAuthConfig,
      },
    });
  }

  public getGoogleSheetConfig(): GoogleSheetConfig {
    return (
      this.config.googleSheetConfig ?? {
        id: "",
        name: "",
        exclude: [],
      }
    );
  }
  public setGoogleSheetConfig(
    googleSheetConfig: Partial<GoogleSheetConfig>
  ): void {
    this.configDataSource.setConfig({
      ...this.config,
      googleSheetConfig: {
        ...this.getGoogleSheetConfig(),
        ...googleSheetConfig,
      },
    });
  }

  public getXcodeConfig(): XcodeConfig {
    return (
      this.config.xcodeConfig ?? {
        custom: {},
      }
    );
  }
  public setXcodeConfig(xcodeConfig: Partial<XcodeConfig>): void {
    this.configDataSource.setConfig({
      ...this.config,
      xcodeConfig: {
        ...this.getXcodeConfig(),
        ...xcodeConfig,
      },
    });
  }
}
