import * as vscode from "vscode";
import { ConfigService } from "../../component/config/config";
import { Toast } from "../../util/toast";

interface InitParams {
  configService: ConfigService;
}

export type TranslationUseCacheCmdArgs = {};

export class TranslationUseCacheCmd {
  private configService: ConfigService;

  constructor({ configService }: InitParams) {
    this.configService = configService;
  }

  public async run(args?: TranslationUseCacheCmdArgs) {
    // Load config
    let useCache = this.configService.getTranslationUseCache();

    // Select whether use cache or not
    const selection = await vscode.window.showQuickPick(
      [
        {
          label: `On ${useCache ? "(current)" : ""}`,
          data: true,
        },
        {
          label: `Off ${!useCache ? "(current)" : ""}`,
          data: false,
        },
      ],
      {
        ignoreFocusOut: true,
        title: "Translation Use Cache",
        placeHolder: "Please select whether to apply cache when translating.",
      }
    );
    if (!selection) {
      return;
    }

    useCache = selection.data;

    // Save config
    await this.configService.setTranslationUseCache(useCache);
    Toast.i(`Translation cache ${useCache ? "on" : "off"}.`);
  }
}
