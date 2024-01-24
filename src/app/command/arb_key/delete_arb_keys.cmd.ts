import * as vscode from "vscode";
import { Arb } from "../../arb/arb";
import { ArbService } from "../../arb/arb.service";
import { ConfigService } from "../../config/config.service";
import { HistoryService } from "../../history/history.service";
import { Toast } from "../../util/toast";

interface InitParams {
  configService: ConfigService;
  arbService: ArbService;
  historyService: HistoryService;
}

export class DeleteKeyCmd {
  private historyService: HistoryService;
  private configService: ConfigService;
  private arbService: ArbService;
  constructor({ configService, arbService, historyService }: InitParams) {
    this.historyService = historyService;
    this.configService = configService;
    this.arbService = arbService;
  }

  async run() {
    // load source arb
    const { sourceArbFilePath } = this.configService.config;
    const sourceArb: Arb = await this.arbService.getArb(sourceArbFilePath);

    // select a key to delete
    const selections = await vscode.window.showQuickPick(
      sourceArb.keys.map(
        (key) =>
          <vscode.QuickPickItem>{
            label: key,
          }
      ),
      {
        title: "Please select the key to delete.",
        placeHolder: "Please select the key to delete.",
        canPickMany: true,
      }
    );
    if (!selections) {
      return;
    }
    const deleteKeys = selections.map((selection) => selection.label);

    // delete keys
    const arbFilePathList = this.arbService.getArbFiles(sourceArbFilePath);
    for (const arbFilePath of arbFilePathList) {
      await this.arbService.deleteKeys(arbFilePath, deleteKeys);
    }

    // delete history key
    this.historyService.deleteKeys(deleteKeys);

    Toast.i(`🟢 Delete arb keys complete.`);
  }
}
