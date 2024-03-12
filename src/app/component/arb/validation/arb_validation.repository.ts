import * as vscode from "vscode";
import { BaseDisposable } from "../../../util/base/base_disposable";
import { Editor } from "../../../util/editor";
import { Highlight, HighlightType } from "../../../util/highlight";
import { ARB } from "../arb";
import { ARBValidation, InvalidType, ValidationResult } from "./arb_validation";

export class ARBValidationRepository extends BaseDisposable {
  public async *generateValidationResult(
    excludeKeywords: string[],
    sourceARB: ARB,
    sourceValidation: ARBValidation,
    targetARB: ARB,
    targetValidation: ARBValidation
  ): AsyncGenerator<ValidationResult, undefined, ValidationResult> {
    const sourceValidationKeys = Object.keys(sourceValidation);
    const targetValidationKeys = Object.keys(targetValidation);
    for (const key of sourceValidationKeys) {
      const sourceTotalParams = sourceValidation[key].nParams;

      // not excluded
      let isNotExcluded = false;
      let notFoundKeyword: string = "";
      for (const keyword of excludeKeywords) {
        const reg = new RegExp(keyword, "gi");
        const nSource = sourceValidation[key].value.match(reg)?.length ?? 0;
        const nTarget = targetValidation[key].value.match(reg)?.length ?? 0;
        if (nSource !== nTarget) {
          isNotExcluded = true;
          notFoundKeyword = keyword;
          break;
        }
      }
      if (isNotExcluded) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.notExcluded,
          invalidMessage: `"${notFoundKeyword}" not found`,
          sourceARB,
          targetARB,
          key,
        };
        continue;
      }

      // key not found
      if (!targetValidationKeys.includes(key)) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.keyNotFound,
          sourceARB,
          targetARB,
          key,
        };
        continue;
      }

      // undecoded html entity exists
      if (targetValidation[key].nHtmlEntities > 0) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.undecodedHtmlEntityExists,
          sourceARB,
          targetARB,
          key,
        };
      }

      // incorrect number of parameters
      if (sourceTotalParams !== targetValidation[key].nParams) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.invalidParameters,
          sourceARB,
          targetARB,
          key,
        };
      }

      // incorrect number of parentheses
      if (
        sourceValidation[key].nParentheses !==
        targetValidation[key].nParentheses
      ) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.invalidParentheses,
          sourceARB,
          targetARB,
          key,
        };
      }
    }
  }

  /**
   * Highlight problematic areas in the source and target arb files
   */
  public async highlight(sourceARB: ARB, targetARB: ARB, key: string) {
    try {
      // clear remain decorations
      Highlight.clear();

      // open document
      const { editor: sourceEditor, document: sourceDocument } =
        await Editor.open(sourceARB.filePath, vscode.ViewColumn.One);
      const { editor: targetEditor, document: targetDocument } =
        await Editor.open(targetARB.filePath, vscode.ViewColumn.Two);

      // search key
      const sourceKeyPosition = Editor.search(sourceEditor, `"${key}"`);
      const targetKeyPosition = Editor.search(targetEditor, `"${key}"`);

      // highlight
      const sourceHighlightedRange = Highlight.add(
        sourceEditor,
        HighlightType.green,
        sourceKeyPosition!.line
      );
      if (targetKeyPosition) {
        // If the key exists in the target arb file
        Highlight.add(targetEditor, HighlightType.red, targetKeyPosition.line);

        // select target value
        const targetValue = targetARB.data[key];
        const targetValueStartIdx = targetDocument
          .getText()
          .indexOf(targetValue);
        targetEditor.selection = new vscode.Selection(
          targetDocument.positionAt(targetValueStartIdx),
          targetDocument.positionAt(targetValueStartIdx + targetValue.length)
        );
      } else {
        // If the key does't exist in the target arb file
        targetEditor.revealRange(
          sourceHighlightedRange,
          vscode.TextEditorRevealType.InCenter
        );
      }

      const removeHighlight = () => {
        Highlight.clear();
        this.disposed();
      };

      let prevTargetJson: string = "";
      this.pushDisposable(
        vscode.workspace.onDidChangeTextDocument((event) => {
          if (event.document === sourceDocument) {
            removeHighlight();
          } else if (event.document === targetDocument) {
            const targetJson = event.document.getText();
            if (prevTargetJson === targetJson) {
              return;
            }
            prevTargetJson = targetJson;
            const updatedTargetData: Record<string, string> =
              JSON.parse(targetJson);
            if (this.isValid(sourceARB.data, updatedTargetData, key)) {
              return removeHighlight();
            }
          }
        })
      );
    } catch (e) {
      throw e;
    }
  }

  private getTotalParams(value: string): number {
    return (value.match(/\{.*?\}/g) || []).length;
  }

  private getTotalParentheses(value: string): number {
    return (value.match(/[(){}\[\]⌜⌟『』<>《》〔〕〘〙【】〖〗⦅⦆]/g) || [])
      .length;
  }

  private getTotalHtmlEntites(value: string): number {
    return (value.match(/&[a-zA-Z]+;/g) || []).length;
  }

  private isValid(
    sourceData: Record<string, string>,
    targetData: Record<string, string>,
    key: string
  ): boolean {
    const sourceValue = sourceData[key];
    const targetValue = targetData[key];
    if (!targetValue) {
      return false;
    } else if (
      this.getTotalParams(sourceValue) !== this.getTotalParams(targetValue)
    ) {
      return false;
    } else if (
      this.getTotalParentheses(sourceValue) !==
      this.getTotalParentheses(targetValue)
    ) {
      return false;
    } else if (
      this.getTotalHtmlEntites(sourceValue) !==
      this.getTotalHtmlEntites(targetValue)
    ) {
      return false;
    } else {
      return true;
    }
  }

  public getParamsValidation(arb: ARB): ARBValidation {
    const parmsValidation: ARBValidation = {};
    for (const [key, value] of Object.entries(arb.data)) {
      if (key !== "@@locale" && key.includes("@")) {
        continue;
      }

      parmsValidation[key] = {
        value,
        nParams: this.getTotalParams(value),
        nParentheses: this.getTotalParentheses(value),
        nHtmlEntities: this.getTotalHtmlEntites(value),
      };
    }
    return parmsValidation;
  }
}
