import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { ArbService } from "../../arb/arb.service";
import { ConfigService } from "../../config/config.service";
import { ArbFileNotFoundException } from "../../util/exceptions";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { Cmd } from "../cmd";

interface InitParams {
  configService: ConfigService;
  arbService: ArbService;
}

export class ArbInitializeCmd {
  private configService: ConfigService;
  private arbService: ArbService;

  constructor({ configService, arbService }: InitParams) {
    this.configService = configService;
    this.arbService = arbService;
  }

  public async run() {
    let { sourceArbFilePath, targetLanguageCodeList } =
      this.configService.config;
    const isSourceArbFile =
      sourceArbFilePath.endsWith(".arb") && fs.existsSync(sourceArbFilePath);

    // sourceArbFilePath
    if (!isSourceArbFile) {
      // search arb files in workspace
      const arbFiles: string[] = await this.arbService.searchArbFiles();
      if (arbFiles.length === 0) {
        // no arb file
        throw new ArbFileNotFoundException();
      }

      // select source arb file
      const selectItems: vscode.QuickPickItem[] = arbFiles.map((arbFile) => {
        return {
          label: arbFile,
        };
      });
      const title =
        "Please select the source arb file that will be the source of translation.";
      Toast.i(title);
      const selectedItem = await vscode.window.showQuickPick(selectItems, {
        title,
      });
      if (!selectedItem) {
        return;
      }

      // update sourceArbFilePath
      sourceArbFilePath = selectedItem.label;
      const prefix = "intl_";
      const isPrefix = path.basename(sourceArbFilePath).startsWith(prefix);
      await this.configService.update({
        sourceArbFilePath,
        ...(isPrefix ? { arbFilePrefix: prefix } : {}),
      });
    }

    // targetLanguageCodeLilst
    if (targetLanguageCodeList.length === 0) {
      await vscode.commands.executeCommand(Cmd.ArbConfigureTargetLanguageCode);
    }

    // open workspace
    Workspace.openSettings();
    Toast.i("Completed adding settings to .vscode/settings.json");
  }
}
