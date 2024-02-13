import * as fs from "fs";
import path from "path";
import { AndroidLanguage } from "../../platform/android/android.language";
import { AndroidMetadata } from "../../platform/android/android.metadata";
import { IOSLanguage } from "../../platform/ios/ios.language";
import { IOSMetadata } from "../../platform/ios/ios.metadata";
import { Workspace } from "../../util/workspace";
import {
  Metadata,
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataType,
} from "./metadata";
import {
  MetadataValidation,
  MetadataValidationType,
} from "./metadata.validation";

export class MetadataRepository {
  private androidMetadataRepository = new AndroidLanguage();
  private iosMetadataRepository = new IOSLanguage();

  public getMetadataPath(platform: MetadataSupportPlatform): string {
    switch (platform) {
      case MetadataSupportPlatform.android:
        return path.join(
          Workspace.getRoot(),
          "android/fastlane/metadata/android"
        );
      case MetadataSupportPlatform.ios:
        return path.join(Workspace.getRoot(), "ios/fastlane/metadata");
    }
  }

  public getSupportLanguages(platform: MetadataSupportPlatform) {
    switch (platform) {
      case MetadataSupportPlatform.android:
        return this.androidMetadataRepository.supportLanguages;
      case MetadataSupportPlatform.ios:
        return this.iosMetadataRepository.supportLanguages;
    }
  }

  public getLanguagesInPlatform(
    platform: MetadataSupportPlatform
  ): MetadataLanguage[] {
    const metadataPath = this.getMetadataPath(platform);
    const supportLanguages = this.getSupportLanguages(platform);
    return supportLanguages.filter((language) => {
      const languagePath = path.join(metadataPath, language.locale);
      return fs.existsSync(languagePath);
    });
  }

  public getExistMetadataFile(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage
  ): Metadata | undefined {
    const metadataPath = this.getMetadataPath(platform);
    if (!fs.existsSync(metadataPath)) {
      // locale not exist
      return;
    }

    let metadata: Metadata;
    switch (platform) {
      case MetadataSupportPlatform.android:
        metadata = new AndroidMetadata(language, metadataPath);
        break;
      case MetadataSupportPlatform.ios:
        metadata = new IOSMetadata(language, metadataPath);
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
    platform: MetadataSupportPlatform,
    language: MetadataLanguage
  ): Metadata {
    const metadataPath = this.getMetadataPath(platform);
    let metadata: Metadata;
    switch (platform) {
      case MetadataSupportPlatform.android:
        metadata = new AndroidMetadata(language, metadataPath);
        break;
      case MetadataSupportPlatform.ios:
        metadata = new IOSMetadata(language, metadataPath);
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

  public check(metadata: Metadata): MetadataValidation {
    const validation: MetadataValidation = {
      metadata: metadata,
      sectionName: `${metadata.platform}/${metadata.language.locale}`,
      validationList: [],
    };
    for (const data of metadata.dataList) {
      let type = MetadataValidationType.normal;
      const filePath = path.join(metadata.languagePath, data.fileName);
      if (!fs.existsSync(filePath)) {
        // file not exist
        type = MetadataValidationType.notExist;
      } else if (!data.optional && data.text.trim().length === 0) {
        // check required
        type = MetadataValidationType.required;
      } else {
        switch (data.type) {
          case MetadataType.text:
            if (data.maxLength && data.text.length > data.maxLength) {
              type = MetadataValidationType.overflow;
            }
            break;
          case MetadataType.url:
            if (data.text.length > 0 && !data.text.startsWith("http")) {
              type = MetadataValidationType.invalidURL;
            }
            break;
        }
      }
      validation.validationList.push({
        data,
        type,
      });
    }
    return validation;
  }
}
