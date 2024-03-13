import * as vscode from "vscode";
import { ConfigService } from "../../component/config/config";
import { Toast } from "../../util/toast";

interface InitParams {
  configService: ConfigService;
}

export type TranslationExcludeCmdArgs = {};

export class TranslationExcludeCmd {
  private configService: ConfigService;
  constructor({ configService }: InitParams) {
    this.configService = configService;
  }

  public async run(args?: TranslationExcludeCmdArgs) {
    // Get translation exclude
    let exclusionKeywords = this.configService.getTranslationExclude();

    // Show input
    const input = await vscode.window.showInputBox({
      value: exclusionKeywords.join(", "),
      title: "Translation Exclude",
      ignoreFocusOut: true,
      placeHolder:
        "Please enter keywords you don't want to translate with commas. (Ignore case)",
    });
    if (!input) {
      return;
    }

    exclusionKeywords = input
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword);

    // Save exclude
    await this.configService.setTranslationExclude(exclusionKeywords);
    Toast.i(`Translation exception keyword added completed.`);
  }
}
