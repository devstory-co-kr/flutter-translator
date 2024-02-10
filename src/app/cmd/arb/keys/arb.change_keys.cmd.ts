import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { HistoryService } from "../../../component/history/history.service";
import { InvalidArgumentsException } from "../../../util/exceptions";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbService: ARBService;
  historyService: HistoryService;
}

export class ARBChangeKeysCmd {
  private historyService: HistoryService;
  private arbService: ARBService;
  constructor({ arbService, historyService }: InitParams) {
    this.historyService = historyService;
    this.arbService = arbService;
  }

  async run() {
    // load source arb
    const sourceArb: ARB = await this.arbService.getSourceARB();

    // enter the keys to change
    const oldKeysInput = await vscode.window.showInputBox({
      title: "Old Keys",
      prompt: "Please enter the keys to change.",
      placeHolder: "e.g. oldKey1, oldKey2",
      ignoreFocusOut: true,
    });
    if (!oldKeysInput) {
      return;
    }

    // check if the keys exist
    const oldKeys = this.split(oldKeysInput);
    for (const oldKey of oldKeys) {
      if (!sourceArb.keys.includes(oldKey)) {
        throw new InvalidArgumentsException(
          `"${oldKey}" is a none-existent key.`
        );
      }
    }

    // enter the keys to change
    const newKeysInput = await vscode.window.showInputBox({
      ignoreFocusOut: true,
      title: "New Keys",
      prompt: "Please enter the keys to change.",
      placeHolder:
        "e.g. newKey1, newKey2 (Replaced in the order entered previously.)",
      validateInput: (value) => {
        const newKeys = this.split(value);
        const newKeysLength = newKeys.length;
        if (newKeysLength !== oldKeys.length) {
          return `Please enter ${oldKeys.length} keys. (current ${newKeysLength})`;
        }

        for (const newKey of newKeys) {
          // check validation
          if (/^[\d\s]|[^a-zA-Z0-9]/.test(newKey)) {
            return `"${newKey}" key is invalid.`;
          }

          // check duplication
          if (sourceArb.keys.includes(newKey)) {
            return `"${newKey}" already exists.`;
          }
        }
        return null;
      },
    });
    if (!newKeysInput) {
      return;
    }

    const newKeys = this.split(newKeysInput);

    // update keys
    const targetARBPathList = await this.arbService.getTargetARBPathList();
    for (const arbFilePath of targetARBPathList) {
      await this.arbService.updateKeys(arbFilePath, oldKeys, newKeys);
    }

    // update history key
    this.historyService.updateKeys(oldKeys, newKeys);

    Toast.i(`🟢 Change arb keys complete.`);
  }

  private split(input: string): string[] {
    return input
      .split(/\s|,/)
      .filter((key) => key)
      .map((key) => key.trim());
  }
}
