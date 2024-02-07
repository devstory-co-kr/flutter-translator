import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { ArbService } from "../../component/arb/arb.service";
import { ConfigService } from "../../component/config/config.service";
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
      const arbFilePathList: string[] =
        await this.arbService.getArbFilePathListInWorkspace();
      if (arbFilePathList.length === 0) {
        // no arb file
        throw new ArbFileNotFoundException();
      }

      // select source arb file
      const rootPath = Workspace.getRoot();
      const selectedItem = await vscode.window.showQuickPick(
        arbFilePathList.map((arbFilePath) => {
          return {
            label: arbFilePath.replace(rootPath, ""),
            arbFilePath,
          };
        }),
        {
          title: "Select Source ARB File",
          placeHolder:
            "Please select the source arb file that will be the source of translation.",
          ignoreFocusOut: true,
        }
      );
      if (!selectedItem) {
        return;
      }

      // update sourceArbFilePath
      sourceArbFilePath = selectedItem.arbFilePath;
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
