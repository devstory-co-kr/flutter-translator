import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Constant } from "./constant";

export class Workspace {
  /**
   * open .vscode/settings.json
   */
  public static openSettings() {
    const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
    const workspaceSettingsPath = path.join(
      workspacePath,
      ".vscode",
      "settings.json"
    );
    vscode.workspace
      .openTextDocument(workspaceSettingsPath)
      .then((document) => vscode.window.showTextDocument(document));
  }

  public static async open(
    filePath: string
  ): Promise<Thenable<vscode.TextEditor>> {
    const document = await vscode.workspace.openTextDocument(filePath);
    return vscode.window.showTextDocument(document);
  }

  public static getRoot() {
    return vscode.workspace.workspaceFolders![0].uri.path;
  }

  public static getPath(...paths: string[]) {
    return path.join(Workspace.getRoot(), ...paths);
  }

  public static getWorkspaceAppPath(...paths: string[]) {
    return path.join(
      Workspace.getRoot(),
      ".vscode",
      Constant.appName,
      ...paths
    );
  }

  public static createPath(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      const dirPath = path.dirname(filePath);
      this.makeRecursiveDirectory(dirPath);
      fs.writeFileSync(filePath, "");
    }
    return fs.existsSync(filePath);
  }

  private static makeRecursiveDirectory(dirPath: string): void {
    const parts = dirPath.split(path.sep);

    // create directiory
    for (let i = 1; i <= parts.length; i++) {
      const currentPath = path.join(...parts.slice(0, i));

      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
      }
    }
  }
}
