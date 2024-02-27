import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { HistoryService } from "../../../component/history/history.service";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbService: ARBService;
  historyService: HistoryService;
}

export class ARBDeleteKeysCmd {
  private historyService: HistoryService;
  private arbService: ARBService;
  constructor({ arbService, historyService }: InitParams) {
    this.historyService = historyService;
    this.arbService = arbService;
  }

  async run() {
    // load source arb
    const sourceArb: ARB = await this.arbService.getSourceARB();

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
        ignoreFocusOut: true,
      }
    );
    if (!selections) {
      return;
    }
    const deleteKeys = selections.map((selection) => selection.label);

    // delete keys
    const targetARBPathList = await this.arbService.getTargetARBPathList();
    for (const arbFilePath of targetARBPathList) {
      await this.arbService.deleteKeys(arbFilePath, deleteKeys);
    }

    // delete history key
    this.historyService.deleteKeys(deleteKeys);

    Toast.i(`🟢 Delete arb keys complete.`);
  }
}
