import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { Constant } from "./constant";
import { WorkspaceNotFoundException } from "./exceptions";

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

  public static deleteDirectory(directoryPath: string): void {
    fs.readdirSync(directoryPath).forEach((file) => {
      const filePath = path.join(directoryPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        Workspace.deleteDirectory(filePath);
      } else {
        fs.unlinkSync(filePath);
      }
    });
    fs.rmdirSync(directoryPath);
  }

  public static async getARBFilePathListInWorkspace(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new WorkspaceNotFoundException();
    }

    // search .arb file
    const arbFilesInFolders: vscode.Uri[][] = await Promise.all(
      workspaceFolders.map((folder) =>
        vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, "**/*.arb")
        )
      )
    );
    const arbFiles: vscode.Uri[] = ([] as vscode.Uri[]).concat(
      ...arbFilesInFolders
    );
    return arbFiles.map((file) => file.path);
  }
  
  public static async getFiles(pattern: string): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new WorkspaceNotFoundException();
    }

    // search
    const arbFilesInFolders: vscode.Uri[][] = await Promise.all(
      workspaceFolders.map((folder) =>
        vscode.workspace.findFiles(
          new vscode.RelativePattern(folder, pattern)
        )
      )
    );
    const arbFiles: vscode.Uri[] = ([] as vscode.Uri[]).concat(
      ...arbFilesInFolders
    );
    return arbFiles.map((file) => file.path);
  }

  public static deleteFile(filePath: string): Thenable<void> {
    const fileUri = vscode.Uri.file(filePath);
    return vscode.workspace.fs.delete(fileUri);
  }
}
