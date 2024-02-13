import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { MigrationScript } from "../migration_script";
import { Version } from "../version";

type GoogleAPIKey = string;
type LanguageCode = string;
type ARBFileName = string;
type FilePath = string;
type GoogleSheetConfig = {
  id: string;
  name: string;
  credentialFilePath: string;
  uploadLanguageCodeList: LanguageCode[];
};

interface PreviousConfig {
  sourceArbFilePath?: FilePath;
  targetLanguageCodeList?: LanguageCode[];
  googleAPIKey?: string;
  arbFilePrefix?: string | undefined;
  customArbFileName?: Record<LanguageCode, ARBFileName>;
  googleSheet?: GoogleSheetConfig;
  validateLanguageCodeList?: LanguageCode[];
}

interface NextConfig {
  arbConfig: {
    sourcePath: FilePath;
    exclude: LanguageCode[];
    prefix?: string | undefined;
    custom: Record<LanguageCode, ARBFileName>;
  };
  googleAuthConfig: {
    apiKey: GoogleAPIKey;
    credential: FilePath;
  };
  googleSheetConfig: {
    id: string;
    name: string;
    exclude: LanguageCode[];
  };
}

export class MigrationV1 implements MigrationScript {
  versoin: Version = new Version("2.0.0");

  public async run(): Promise<void> {
    // Update config name from "arbTranslator" to "flutterTranslator"
    await this.updateConfig();

    // update workspace app directory name from "arb-translator" to "flutter-translator"
    this.updateWorkspaceAppDirectoryName();
  }

  private async updateConfig() {
    const nextKey = "flutterTranslator";
    const previousKey = "arbTranslator";
    const previousWorkspace = vscode.workspace.getConfiguration(previousKey);
    const previousConfig = previousWorkspace.get<PreviousConfig>("config");
    if (previousConfig && Object.keys(previousConfig).length > 0) {
      // convert arbTranslator to flutterTranslator
      const nextWorkspace = vscode.workspace.getConfiguration(nextKey);
      const nextConfig = <NextConfig>{
        arbConfig: {
          sourcePath: previousConfig.sourceArbFilePath ?? "",
          exclude: [],
          custom: {},
          prefix: previousConfig.arbFilePrefix,
        },
        googleAuthConfig: {
          apiKey: previousConfig.googleAPIKey ?? "",
          credential: previousConfig.googleSheet?.credentialFilePath ?? "",
        },
        googleSheetConfig: {
          id: previousConfig.googleSheet?.id ?? "",
          name: previousConfig.googleSheet?.name ?? "",
          exclude: [],
        },
      };
      await nextWorkspace.update("config", nextConfig);
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
