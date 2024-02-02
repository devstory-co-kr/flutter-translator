import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { MigrationScript } from "../migration_script";
import { Version } from "../version";

type LanguageCode = string;
type ArbFileName = string;
type ArbFilePath = string;
type GoogleSheetConfig = {
  id: string;
  name: string;
  credentialFilePath: string;
  uploadLanguageCodeList: LanguageCode[];
};

interface _Config {
  sourceArbFilePath: ArbFilePath;
  targetLanguageCodeList: LanguageCode[];
  googleAPIKey: string;
  arbFilePrefix?: string;
  customArbFileName?: Record<LanguageCode, ArbFileName>;
  googleSheet?: GoogleSheetConfig;
  validateLanguageCodeList?: LanguageCode[];
}

export class MigrationV1 implements MigrationScript {
  versoin: Version = new Version("2.0.0");

  public async run(): Promise<void> {
    // Update config name from "arbTranslator" to "flutterTranslator"
    await this.updateConfigName();

    // update workspace app directory name from "arb-translator" to "flutter-translator"
    this.updateWorkspaceAppDirectoryName();
  }

  private async updateConfigName() {
    const currentKey = "flutterTranslator";
    const previousKey = "arbTranslator";
    const previousWorkspace = vscode.workspace.getConfiguration(previousKey);
    const previousConfig = previousWorkspace.get<_Config>("config");
    if (previousConfig && Object.keys(previousConfig).length > 0) {
      // convert arbTranslator to flutterTranslator
      const currentWorkspace = vscode.workspace.getConfiguration(currentKey);
      await currentWorkspace.update("config", previousConfig);
      // delete arbTranslator
      await previousWorkspace.update("config", undefined);
    }
  }

  private updateWorkspaceAppDirectoryName() {
    const workspacePath = vscode.workspace.workspaceFolders![0].uri.path;
    const previousAppName = "arb-translator";
    const previousAppDirectory = path.join(
      workspacePath,
      ".vscode",
      previousAppName
    );
    if (fs.existsSync(previousAppDirectory)) {
      const currentAppName = "flutter-translator";
      const currentAppDirectory = path.join(
        workspacePath,
        ".vscode",
        currentAppName
      );
      fs.renameSync(previousAppDirectory, currentAppDirectory);
    }
  }
}
