import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { AndroidMetadata } from "../../platform/android/android.metadata";
import { AndroidMetadataLanguage } from "../../platform/android/android.metadata_language";
import { IosMetadata } from "../../platform/ios/ios.metadata";
import { IosMetadataLanguage } from "../../platform/ios/ios.metadata_language";
import { Editor } from "../../util/editor";
import { Workspace } from "../../util/workspace";
import {
  Metadata,
  MetadataLanguage,
  MetadataPlatform,
  MetadataType,
} from "./metadata";
import {
  MetadataValidation,
  MetadataValidationItem,
  MetadataValidationType,
} from "./metadata.validation";

interface InitParams {
  androidMetadataLanguage: AndroidMetadataLanguage;
  iosMetadataLanguage: IosMetadataLanguage;
}

export class MetadataRepository {
  private androidMetadataLanguage: AndroidMetadataLanguage;
  private iosMetadataLanguage: IosMetadataLanguage;

  // Sort by MetadataLanguage RTL first & name descending
  private sortMetadataLanguage(
    languages: MetadataLanguage[]
  ): MetadataLanguage[] {
    return languages.sort((a, b) => {
      if (a.translateLanguage.isLTR === b.translateLanguage.isLTR) {
        // If isLTR is the same, sort in ascending order based on name
        return a.name.localeCompare(b.name);
      } else {
        // If isLTR is different, sort elements with false first
        return a.translateLanguage.isLTR ? 1 : -1;
      }
    });
  }

  constructor({ androidMetadataLanguage, iosMetadataLanguage }: InitParams) {
    this.androidMetadataLanguage = androidMetadataLanguage;
    this.iosMetadataLanguage = iosMetadataLanguage;
  }

  public getMetadataAbsolutePath(platform: MetadataPlatform): string {
    return path.join(
      Workspace.getRoot(),
      this.getMetadataWorkspacePath(platform),
    );
  }
  
  public getMetadataWorkspacePath(platform: MetadataPlatform): string {
    switch (platform) {
      case MetadataPlatform.android:
        return "android/fastlane/metadata/android";
      case MetadataPlatform.ios:
        return "ios/fastlane/metadata";
    }
  }

  public getSupportLanguages(platform: MetadataPlatform): MetadataLanguage[] {
    let supportLanguages: MetadataLanguage[] = [];
    switch (platform) {
      case MetadataPlatform.android:
        supportLanguages =
          this.androidMetadataLanguage.supportMetadataLanguages;
        break;
      case MetadataPlatform.ios:
        supportLanguages = this.iosMetadataLanguage.supportMetadataLanguages;
        break;
    }
    return this.sortMetadataLanguage(supportLanguages);
  }

  public getLanguagesInPlatform(
    platform: MetadataPlatform
  ): MetadataLanguage[] {
    const metadataPath = this.getMetadataAbsolutePath(platform);
    return this.getSupportLanguages(platform).filter((language) => {
      const languagePath = path.join(metadataPath, language.locale);
      return fs.existsSync(languagePath);
    });
  }

  public getExistMetadataFile(
    platform: MetadataPlatform,
    language: MetadataLanguage
  ): Metadata | undefined {
    const metadataPath = this.getMetadataAbsolutePath(platform);
    if (!fs.existsSync(metadataPath)) {
      // locale not exist
      return;
    }

    let metadata: Metadata;
    switch (platform) {
      case MetadataPlatform.android:
        metadata = new AndroidMetadata(language, metadataPath);
        break;
      case MetadataPlatform.ios:
        metadata = new IosMetadata(language, metadataPath);
        break;
    }

    for (const data of metadata.dataList) {
      const dataPath = path.join(metadata.languagePath, data.fileName);
      if (fs.existsSync(dataPath)) {
        // exist -> read previous text
        data.text = fs.readFileSync(dataPath, "utf8").trim();
      } else {
        // not exist
      }
    }

    return metadata;
  }

  public createMetadataFile(
    platform: MetadataPlatform,
    language: MetadataLanguage
  ): Metadata {
    const metadataPath = this.getMetadataAbsolutePath(platform);
    let metadata: Metadata;
    switch (platform) {
      case MetadataPlatform.android:
        metadata = new AndroidMetadata(language, metadataPath);
        break;
      case MetadataPlatform.ios:
        metadata = new IosMetadata(language, metadataPath);
        break;
    }

    for (const data of metadata.dataList) {
      const dataPath = path.join(metadata.languagePath, data.fileName);
      if (fs.existsSync(dataPath)) {
        // exist -> read previous text
        data.text = fs.readFileSync(dataPath, "utf8").trim();
      } else {
        // not exist -> create
        Workspace.createPath(dataPath);
      }
    }

    return metadata;
  }

  public updateMetadata(metadata: Metadata): Metadata {
    for (const data of metadata.dataList) {
      const filePath = path.join(metadata.languagePath, data.fileName);
      fs.writeFileSync(filePath, data.text);
    }
    return metadata;
  }

  public updateMetadataText(filePath: string, text: string): void {
    if (!fs.existsSync(filePath)) {
      Workspace.createPath(filePath);
    }
    fs.writeFileSync(filePath, text);
  }

  public async openInvalidEditor(validation: MetadataValidationItem) {
    const { sourceMetadata, targetMetadata, sourceData, targetData, type } =
      validation;
    if (!sourceData) {
      return;
    }

    // open document
    await Editor.open(
      path.join(sourceMetadata.languagePath, sourceData.fileName),
      vscode.ViewColumn.One
    );
    await Editor.open(
      path.join(targetMetadata.languagePath, targetData.fileName),
      vscode.ViewColumn.Two
    );
  }

  public check(
    sourceMetadata: Metadata,
    targetMetadata: Metadata,
    excludeKeywords: string[]
  ): MetadataValidation {
    const validation: MetadataValidation = {
      sourceMetadata,
      targetMetadata,
      sectionName: `${targetMetadata.platform}/${targetMetadata.language.locale}`,
      validationList: [],
    };
    for (const targetData of targetMetadata.dataList) {
      const targetFilePath = path.join(
        targetMetadata.languagePath,
        targetData.fileName
      );
      const sourceData = sourceMetadata.dataList.find(
        (data) => data.fileName === targetData.fileName
      );
      const currentLength = targetData.text.length;
      const maxLength = targetData.maxLength ?? 0;
      const overflow = currentLength - maxLength;

      if (!fs.existsSync(targetFilePath)) {
        // file not exist
        validation.validationList.push({
          sourceData,
          targetData,
          type: MetadataValidationType.notExist,
          message: `${targetFilePath} does not exist.`,
        });
      } else if (!targetData.optional && targetData.text.trim().length === 0) {
        // required
        validation.validationList.push({
          sourceData,
          targetData,
          type: MetadataValidationType.required,
          message: `${
            targetData.fileName
          } is required (maxLength: ${maxLength.toLocaleString()})`,
        });
      } else {
        switch (targetData.type) {
          case MetadataType.text:
            if (maxLength && currentLength > maxLength) {
              // over flow
              validation.validationList.push({
                sourceData,
                targetData,
                type: MetadataValidationType.overflow,
                message: `Characters overflow (max: ${maxLength.toLocaleString()} / current: ${currentLength} / overflow: ${overflow.toLocaleString()})`,
              });
            }

            if (sourceData) {
              let isNotExcluded = false;
              let notFoundKeyword: string = "";
              for (const keyword of excludeKeywords) {
                const reg = new RegExp(keyword, "gi");
                const nSource = sourceData.text.match(reg)?.length ?? 0;
                const nTarget = targetData.text.match(reg)?.length ?? 0;
                if (nSource !== nTarget) {
                  isNotExcluded = true;
                  notFoundKeyword = keyword;
                  break;
                }
              }
              if (isNotExcluded) {
                // not excluded
                validation.validationList.push({
                  sourceData,
                  targetData,
                  type: MetadataValidationType.notExcluded,
                  message: `"${notFoundKeyword}" not found`,
                });
              }
            }
            break;
          case MetadataType.url:
            if (
              targetData.text.length > 0 &&
              !targetData.text.startsWith("http")
            ) {
              // invalid URL
              validation.validationList.push({
                sourceData,
                targetData,
                type: MetadataValidationType.invalidURL,
                message: targetData.optional
                  ? `${targetData.fileName} can enter a URL starting with http or leave it blank.`
                  : `${targetData.fileName} must enter a URL starting with http.`,
              });
            }
            break;
        }
      }
    }
    return validation;
  }
}
