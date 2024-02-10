import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { HistoryChange } from "../../../component/history/history";
import { HistoryService } from "../../../component/history/history.service";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbService: ARBService;
  historyService: HistoryService;
}

export class ARBExcludeTranslationCmd {
  private arbService: ARBService;
  private historyService: HistoryService;

  constructor({ arbService, historyService }: InitParams) {
    this.arbService = arbService;
    this.historyService = historyService;
  }

  public async run() {
    // get source arb
    const sourceArb: ARB = await this.arbService.getSourceARB();

    // get changed items in source arb file
    const changes: HistoryChange[] = this.historyService.compare(sourceArb);
    if (changes.length === 0) {
      Toast.i("There are no changes in the sourceArb file.");
      return;
    }

    // select changes to exclude from translation
    const items = changes.map((change) => {
      const isNewValue = change.historyValue === change.sourceValue;
      return {
        label: change.key,
        description: isNewValue
          ? change.sourceValue
          : `${change.historyValue} → ${change.sourceValue}`,
        sourceValue: change.sourceValue,
        picked: true,
      };
    });
    const selectedItems =
      (await vscode.window.showQuickPick(items, {
        title: "Select changes to exclude from translation",
        canPickMany: true,
        ignoreFocusOut: true,
      })) ?? [];
    if (selectedItems.length === 0) {
      return;
    }

    // update history
    const historyData = { ...sourceArb.data };
    for (const selectedItem of selectedItems) {
      const key: string = selectedItem.label;
      const value: string = selectedItem.sourceValue!;
      historyData[key] = value;
    }

    this.historyService.update(historyData);
    Toast.i(
      `${selectedItems.length} items excluded from translation completed. (If that key does not exist in the targetArb file, it will be translated.)`
    );
  }
}
