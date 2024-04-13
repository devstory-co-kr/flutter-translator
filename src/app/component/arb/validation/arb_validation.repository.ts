import * as vscode from "vscode";
import { BaseDisposable } from "../../../util/base/base_disposable";
import { Editor } from "../../../util/editor";
import { Highlight, HighlightType } from "../../../util/highlight";
import Statistic from "../../../util/statistic";
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
      } else {
        // not excluded
        let isNotExcluded = false;
        let notFoundKeyword: string = "";
        for (const keyword of excludeKeywords) {
          const reg = new RegExp(keyword, "gi");
          const nSource = sourceValidation[key].text.match(reg)?.length ?? 0;
          const nTarget = targetValidation[key].text.match(reg)?.length ?? 0;
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

      // incorrect number of line breaks
      if (
        sourceValidation[key].nLineBreaks !== targetValidation[key].nLineBreaks
      ) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.invalidLineBreaks,
          sourceARB,
          targetARB,
          key,
        };
      }

      // incorrect number of parameters
      if (sourceValidation[key].nParams !== targetValidation[key].nParams) {
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

      // incorrect parameter name
      for (const paramName of sourceValidation[key].paramNames) {
        if (!targetValidation[key].paramNames.includes(paramName)) {
          yield <ValidationResult>{
            sourceValidationData: sourceValidation[key],
            invalidType: InvalidType.invalidParameterName,
            invalidMessage: `${paramName} not found`,
            sourceARB,
            targetARB,
            key,
          };
        }
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
        targetEditor.selection = Editor.selectFromARB(
          targetEditor,
          key,
          targetValue
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
      Statistic.getTotalParams(sourceValue) !==
      Statistic.getTotalParams(targetValue)
    ) {
      return false;
    } else if (
      Statistic.getTotalParentheses(sourceValue) !==
      Statistic.getTotalParentheses(targetValue)
    ) {
      return false;
    } else if (
      Statistic.getTotalHtmlEntites(sourceValue) !==
      Statistic.getTotalHtmlEntites(targetValue)
    ) {
      return false;
    } else {
      return true;
    }
  }

  public getValidation(arb: ARB): ARBValidation {
    const parmsValidation: ARBValidation = {};
    for (const [key, value] of Object.entries(arb.data)) {
      if (key !== "@@locale" && key.includes("@")) {
        continue;
      }

      parmsValidation[key] = Statistic.getTextStatistic(value);
    }
    return parmsValidation;
  }
}
