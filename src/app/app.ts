import * as vscode from "vscode";
import { ChangelogCreateCmdArgs } from "./cmd/changelog/changelog_create.cmd";
import { ChangelogTranslateCmdArgs } from "./cmd/changelog/changelog_translate.cmd";
import { Cmd } from "./cmd/cmd";
import { MetadataAddLanguagesCmdArgs } from "./cmd/metadata/metadata_add_languages.cmd";
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
  commands: Record<Cmd, (args: any) => void>;
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
    // ARB Command
    [Cmd.ArbInitialize]: () => this.registry.ArbInitializeCmd.run(),
    [Cmd.ArbTranslate]: () => this.registry.arbTranslateCmd.run(),
    [Cmd.ArbExcludeTranslation]: () =>
      this.registry.arbExcludeTranslationCmd.run(),
    [Cmd.ArbConfigureTargetLanguageCode]: () =>
      this.registry.arbSelectTargetLanguageCodeCmd.run(),
    [Cmd.ArbCheckTranslation]: () => this.registry.arbCheckTranslationCmd.run(),
    [Cmd.ArbDecodeAllHtmlEntities]: () =>
      this.registry.arbDecodeAllHtmlEntitiesCmd.run(),
    [Cmd.ArbUploadToGoogleSheet]: () =>
      this.registry.arbUploadToGoogleSheetCmd.run(),
    [Cmd.ArbOpenGoogleSheet]: () => this.registry.arbOpenGoogleSheetCmd.run(),
    [Cmd.ArbChangeKeys]: () => this.registry.arbChangeKeysCmd.run(),
    [Cmd.ArbDeleteKeys]: () => this.registry.arbDeleteKeysCmd.run(),
    // Metadata Command
    [Cmd.MetadataAddLanguages]: (args?: MetadataAddLanguagesCmdArgs) =>
      this.registry.metadataAddLanguagesCmd.run(args),
    [Cmd.MetadataEditLanguage]: () =>
      this.registry.metadataEditLanguageCmd.run(),
    [Cmd.MetadataTranslate]: () => this.registry.metadataTranslateCmd.run(),
    [Cmd.MetadataCheck]: () => this.registry.metadataCheckCmd.run(),
    // Changelog Command
    [Cmd.ChangelogCreate]: (args?: ChangelogCreateCmdArgs) =>
      this.registry.changelogCreateCmd.run(args),
    [Cmd.ChangelogTranslate]: (args?: ChangelogTranslateCmdArgs) =>
      this.registry.changelogTranslateCmd.run(args),
    [Cmd.ChangelogCheck]: () => this.registry.changelogCheckCmd.run(),
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
