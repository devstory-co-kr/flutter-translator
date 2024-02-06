import path from "path";
import * as vscode from "vscode";
import { Constant } from "../../util/constant";
import { Logger } from "../../util/logger";
import { Toast } from "../../util/toast";
import { MigrationScript } from "./migration_script";
import { MigrationV1 } from "./scripts/migration.v1";
import { Version } from "./version";
import { VersionRepository } from "./version.repository";

interface InitParams {
  versionRepository: VersionRepository;
}

export class MigrationService {
  private versionRepository: VersionRepository;
  private migrationScripts: MigrationScript[] = [new MigrationV1()];

  constructor({ versionRepository }: InitParams) {
    this.versionRepository = versionRepository;
  }

  public async checkMigrate(context: vscode.ExtensionContext): Promise<void> {
    const { currentVersion, latestVersion } = this.getVersions(context);
    const isUpdated = currentVersion.isGreaterThan(latestVersion);
    if (isUpdated) {
      await this.migrate({ context, currentVersion, latestVersion });
      await this.versionRepository.updateLatestVersion(context, currentVersion);
      Toast.i(`${Constant.appName} updated to ${currentVersion.toString()}`);
    }
  }

  private getVersions(context: vscode.ExtensionContext): {
    currentVersion: Version;
    latestVersion: Version;
  } {
    const packagePath = path.join(context.extensionPath, "package.json");
    const currentVersion = new Version(require(packagePath).version);
    const latestVersion = this.versionRepository.getLatestVersion(context);
    return {
      currentVersion,
      latestVersion,
    };
  }

  private async migrate({
    context,
    currentVersion,
    latestVersion,
  }: {
    context: vscode.ExtensionContext;
    currentVersion: Version;
    latestVersion: Version;
  }) {
    if (currentVersion.isEqualTo(latestVersion)) {
      return;
    }

    for (const migrationScript of this.migrationScripts) {
      const migrationVersion = migrationScript.versoin;
      if (migrationVersion.isGreaterThan(latestVersion)) {
        Logger.i(
          `Migrate ${latestVersion.toString()} -> ${migrationVersion.toString()}`
        );
        await migrationScript.run();
        await this.versionRepository.updateLatestVersion(
          context,
          migrationVersion
        );
      }
    }
  }
}
