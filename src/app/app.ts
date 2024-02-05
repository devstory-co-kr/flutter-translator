import * as vscode from "vscode";
import { Cmd } from "./command/cmd";
import { Registry } from "./registry";
import { Constant } from "./util/constant";
import { Dialog } from "./util/dialog";
import {
  APIKeyRequiredException,
  ConfigNotFoundException,
  ConfigurationRequiredException,
  MigrationFailureException,
  WorkspaceNotFoundException,
} from "./util/exceptions";
import { Logger } from "./util/logger";
import { Toast } from "./util/toast";

export interface App {
  name: string;
  commands: Record<Cmd, (context: vscode.ExtensionContext) => void>;
  init: () => any;
  migrate: (context: vscode.ExtensionContext) => Promise<void>;
  disposed: () => void;
  onException: (e: any) => void;
}

export class FlutterTranslator implements App {
  private registry: Registry;

  constructor() {
    Logger.i(`${this.name} initiated.`);
    this.registry = new Registry();
  }

  public name: string = Constant.appName;

  public commands = {
    [Cmd.ArbInitialize]: () => this.registry.initializeCmd.run(),
    [Cmd.ArbTranslate]: () => this.registry.arbTranslateCmd.run(),
    [Cmd.ArbExcludeTranslation]: () =>
      this.registry.arbExcludeTranslationCmd.run(),
    [Cmd.ArbConfigureTargetLanguageCode]: () =>
      this.registry.arbSelectTargetLanguageCodeCmd.run(),
    [Cmd.ArbValidateTranslation]: () =>
      this.registry.arbValidateTranslationCmd.run(),
    [Cmd.ArbDecodeAllHtmlEntities]: () =>
      this.registry.arbDecodeAllHtmlEntitiesCmd.run(),
    [Cmd.ArbUploadToGoogleSheet]: () =>
      this.registry.arbUploadToGoogleSheetCmd.run(),
    [Cmd.ArbOpenGoogleSheet]: () => this.registry.arbOpenGoogleSheetCmd.run(),
    [Cmd.ArbChangeKeys]: () => this.registry.arbChangeKeysCmd.run(),
    [Cmd.ArbDeleteKeys]: () => this.registry.arbDeleteKeysCmd.run(),
    [Cmd.MetadataAddLanguages]: () =>
      this.registry.metadataAddLanguagesCmd.run(),
    [Cmd.MetadataEditLanguage]: () =>
      this.registry.metadataEditLanguageCmd.run(),
    [Cmd.MetadataTranslate]: () => this.registry.metadataTranslateCmd.run(),
  };

  public init = async () => {
    // check workspace
    if (!vscode.workspace.workspaceFolders) {
      throw new WorkspaceNotFoundException();
    }

    // initialize
    await this.registry.init();
  };

  public migrate = (context: vscode.ExtensionContext): Promise<void> => {
    try {
      return this.registry.migrationService.checkMigrate(context);
    } catch (e: any) {
      Logger.e(e);
      throw new MigrationFailureException();
    }
  };

  public disposed = () => {
    this.registry.disposed();
  };

  public onException = async (e: any) => {
    if (e instanceof ConfigNotFoundException) {
      await vscode.commands.executeCommand(Cmd.ArbInitialize);
    } else if (e instanceof ConfigurationRequiredException) {
      Dialog.showTargetLanguageCodeListRequiredDialog();
    } else if (e instanceof APIKeyRequiredException) {
      Dialog.showAPIKeyRequiredDialog();
    } else {
      Toast.e(e.message);
    }
    Logger.e(e);
  };
}
