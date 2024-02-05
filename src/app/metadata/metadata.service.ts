import * as fs from "fs";
import path from "path";
import * as vscode from "vscode";
import {} from "../config/config.service";
import {
  Metadata,
  MetadataLanguage,
  MetadataSupportPlatform,
  MetadataType,
} from "./metadata";
import { MetadataRepository } from "./metadata.repository";

interface InitParams {
  metadataRepository: MetadataRepository;
}

export class MetadataService {
  private metadataRepository: MetadataRepository;

  constructor({ metadataRepository }: InitParams) {
    this.metadataRepository = metadataRepository;
  }

  public async selectPlatform({
    title,
    placeHolder,
  }: {
    title?: string;
    placeHolder?: string;
  }): Promise<MetadataSupportPlatform | undefined> {
    const selectedPlatform = await vscode.window.showQuickPick(
      Object.entries(MetadataSupportPlatform).map(([label, value]) => ({
        label,
        platform: value as MetadataSupportPlatform,
      })),
      {
        title: title ?? "Select Platform",
        placeHolder: placeHolder ?? "Select Platform",
      }
    );
    return selectedPlatform?.platform;
  }

  public getMetadataPath(platform: MetadataSupportPlatform): string {
    return this.metadataRepository.getMetadataPath(platform);
  }

  public getLanguageList(
    platform: MetadataSupportPlatform
  ): MetadataLanguage[] {
    const metadataPath = this.getMetadataPath(platform);
    const supportLanguages =
      this.metadataRepository.getSupportLanguages(platform);
    return supportLanguages.filter((language) => {
      const languagePath = path.join(metadataPath, language.locale);
      return fs.existsSync(languagePath);
    });
  }

  public async selectLanguageList({
    platform,
    selectedLanguages,
    title,
    placeHolder,
  }: {
    platform: MetadataSupportPlatform;
    selectedLanguages: MetadataLanguage[];
    title?: string;
    placeHolder?: string;
  }): Promise<MetadataLanguage[]> {
    const languages = this.metadataRepository.getSupportLanguages(platform);
    const selections = await vscode.window.showQuickPick(
      languages.map((language) => ({
        label: language.name,
        description: language.locale,
        picked: selectedLanguages.includes(language),
        language,
      })),
      {
        title: title ?? "Select Language list",
        placeHolder: placeHolder ?? "Select Language list",
        canPickMany: true,
        ignoreFocusOut: true,
      }
    );
    return (selections ?? []).map((selection) => selection.language);
  }

  public async selectLanguage({
    languageList,
    title,
    placeHolder,
  }: {
    languageList: MetadataLanguage[];
    title?: string;
    placeHolder?: string;
  }): Promise<MetadataLanguage | undefined> {
    const selectedLocale = await vscode.window.showQuickPick(
      languageList.map((language) => ({
        label: language.name,
        description: language.locale,
        language,
      })),
      {
        title: title ?? "Select Language",
        placeHolder: placeHolder ?? "Select Language",
        ignoreFocusOut: true,
      }
    );
    return selectedLocale?.language;
  }

  public getMetadataFile(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage
  ): Metadata {
    return this.metadataRepository.getMetadataFile(platform, language);
  }

  public saveMetadata(metadata: Metadata): Metadata {
    return this.metadataRepository.saveMetadata(metadata);
  }

  public async showMetadataInputBox(
    metadata: Metadata
  ): Promise<Metadata | undefined> {
    for (const data of metadata.dataList) {
      const maxLengthGuide = `Please write the ${data.fileName} within ${data.maxLength} characters.`;
      const urlGuide = `Please enter ${data.fileName} in URL format starting with http.`;
      const optional = data.optional ? "(Optional) " : "(Required) ";
      const text = await vscode.window.showInputBox({
        title: data.fileName,
        ignoreFocusOut: true,
        value: data.text,
        placeHolder:
          optional +
          (data.maxLength
            ? maxLengthGuide
            : data.type === MetadataType.url
            ? urlGuide
            : ""),
        validateInput: (value) => {
          // optional
          if (data.optional && !value) {
            return null;
          }

          switch (data.type) {
            case MetadataType.text:
              if (data.maxLength && value.length > data.maxLength) {
                return maxLengthGuide;
              }
              break;
            case MetadataType.url:
              if (!data.text.startsWith("http")) {
                return urlGuide;
              }
              break;
          }
          if (!data.optional && !value) {
            return `${data.fileName} is required.`;
          }
        },
      });

      if (!data.optional && !text) {
        // canceled
        return;
      }

      data.text = text ?? "";
    }
    return metadata;
  }
}
