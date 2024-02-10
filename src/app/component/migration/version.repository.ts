import * as vscode from "vscode";
import { Version } from "./version";

export class VersionRepository {
  private latestVersion: string = "latestVersion";

  public getLatestVersion(context: vscode.ExtensionContext): Version {
    const latestVersion = context.workspaceState.get<Version | undefined>(
      this.latestVersion
    );
    if (latestVersion) {
      return new Version(
        `${latestVersion.major}.${latestVersion.minor}.${latestVersion.patch}`
      );
    } else {
      return new Version("0.0.0");
    }
  }

  public updateLatestVersion(
    context: vscode.ExtensionContext,
    version: Version
  ): Thenable<void> {
    return context.workspaceState.update(this.latestVersion, version);
  }
}
