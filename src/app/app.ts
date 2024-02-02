import * as vscode from "vscode";
import { Cmd } from "./command/cmd";
import { Registry } from "./registry";
import { Constant } from "./util/constant";
import { Dialog } from "./util/dialog";
import {
  APIKeyRequiredException,
  ConfigNotFoundException,
  ConfigurationRequiredException,
  WorkspaceNotFoundException,
} from "./util/exceptions";
import { Logger } from "./util/logger";
import { Toast } from "./util/toast";

export interface App {
  name: string;
  commands: Record<Cmd, (context: vscode.ExtensionContext) => void>;
  init: () => any;
  disposed: () => void;
  onException: (e: any) => void;
}

export class ArbTranslator implements App {
  private registry: Registry;

  constructor() {
    Logger.i(`${this.name} initiated.`);
    this.registry = new Registry();
  }

  public name: string = Constant.appName;

  public commands = {
    [Cmd.ArbInitialize]: () => this.registry.arbInitializeCmd.run(),
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
  };

  public init = async () => {
    // check workspace
    if (!vscode.workspace.workspaceFolders) {
      throw new WorkspaceNotFoundException();
    }

    // initialize
    await this.registry.init();
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
