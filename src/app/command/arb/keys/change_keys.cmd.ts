import * as vscode from "vscode";
import { Arb } from "../../../arb/arb";
import { ArbService } from "../../../arb/arb.service";
import { ConfigService } from "../../../config/config.service";
import { HistoryService } from "../../../history/history.service";
import { InvalidArgumentsException } from "../../../util/exceptions";
import { Toast } from "../../../util/toast";

interface InitParams {
  configService: ConfigService;
  arbService: ArbService;
  historyService: HistoryService;
}

export class ArbChangeKeysCmd {
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
    const arbFilePathList = this.arbService.getArbFiles(sourceArbFilePath);
    for (const arbFilePath of arbFilePathList) {
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
