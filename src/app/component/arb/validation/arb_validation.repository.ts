import * as vscode from "vscode";
import { BaseDisposable } from "../../../util/base/base_disposable";
import { Editor } from "../../../util/editor";
import { Highlight, HighlightType } from "../../../util/highlight";
import { Arb } from "../arb";
import { ArbValidation, InvalidType, ValidationResult } from "./arb_validation";

export class ArbValidationRepository extends BaseDisposable {
  public async *generateValidationResult(
    sourceArb: Arb,
    sourceValidation: ArbValidation,
    targetArb: Arb,
    targetValidation: ArbValidation
  ): AsyncGenerator<ValidationResult, undefined, ValidationResult> {
    const sourceValidationKeys = Object.keys(sourceValidation);
    const targetValidationKeys = Object.keys(targetValidation);

    for (const key of sourceValidationKeys) {
      const sourceTotalParams = sourceValidation[key].nParams;

      // key not found
      if (!targetValidationKeys.includes(key)) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.keyNotFound,
          sourceArb,
          targetArb,
          key,
        };
        continue;
      }

      // undecoded html entity exists
      if (targetValidation[key].nHtmlEntities > 0) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.undecodedHtmlEntityExists,
          sourceArb,
          targetArb,
          key,
        };
      }

      // incorrect number of parameters
      if (sourceTotalParams !== targetValidation[key].nParams) {
        yield <ValidationResult>{
          sourceValidationData: sourceValidation[key],
          invalidType: InvalidType.invalidParameters,
          sourceArb,
          targetArb,
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
          sourceArb,
          targetArb,
          key,
        };
      }
    }
  }

  /**
   * Highlight problematic areas in the source and target arb files
   * @param sourceArb
   * @param targetArb
   * @param key
   * @param sourceArbValidationData
   */
  public async highlight(sourceArb: Arb, targetArb: Arb, key: string) {
    try {
      // clear remain decorations
      Highlight.clear();

      // open document
      const { editor: sourceEditor, document: sourceDocument } =
        await Editor.open(sourceArb.filePath, vscode.ViewColumn.One);
      const { editor: targetEditor, document: targetDocument } =
        await Editor.open(targetArb.filePath, vscode.ViewColumn.Two);

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
        const targetValue = targetArb.data[key];
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
            if (this.isValid(sourceArb.data, updatedTargetData, key)) {
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

  public getParamsValidation(arb: Arb): ArbValidation {
    const parmsValidation: ArbValidation = {};
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
