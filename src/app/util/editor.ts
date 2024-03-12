import * as vscode from "vscode";

export class Editor {
  public static async open(
    filePath: string,
    column?: vscode.ViewColumn,
    preserveFocus?: boolean
  ): Promise<{ editor: vscode.TextEditor; document: vscode.TextDocument }> {
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(
      document,
      column,
      preserveFocus
    );
    return {
      editor,
      document,
    };
  }

  public static search(
    editor: vscode.TextEditor,
    searchText: string
  ): vscode.Position | undefined {
    const startPos = editor.document.getText().indexOf(searchText);
    if (startPos !== -1) {
      return editor.document.positionAt(startPos);
    } else {
      return undefined;
    }
  }

  public static select(
    editor: vscode.TextEditor,
    searchText: string
  ): vscode.Selection[] {
    const documentText = editor.document.getText();

    const regex = new RegExp(searchText, "g");
    let match;
    let selections: vscode.Selection[] = [];
    while ((match = regex.exec(documentText))) {
      const startPosition = editor.document.positionAt(match.index);
      const endPosition = editor.document.positionAt(
        match.index + searchText.length
      );
      const selectionRange = new vscode.Range(startPosition, endPosition);
      selections.push(
        new vscode.Selection(selectionRange.start, selectionRange.end)
      );
    }

    // Apply selections to editor
    editor.selections = selections;
    return selections;
  }

  public static selectFromARB(
    editor: vscode.TextEditor,
    key: string,
    value: string
  ): vscode.Selection {
    const documentText = editor.document.getText();
    const keyText = `"${key}": "`;
    const startIndex = documentText.indexOf(keyText) + keyText.length;
    const startPosition = editor.document.positionAt(startIndex);
    const endPosition = editor.document.positionAt(startIndex + value.length);
    const selection = new vscode.Selection(startPosition, endPosition);
    editor.selections = [selection];
    return selection;
  }
}
