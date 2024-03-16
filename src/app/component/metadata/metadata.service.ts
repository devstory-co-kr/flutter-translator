import path from "path";
import * as vscode from "vscode";
import { Dialog } from "../../util/dialog";
import { Link } from "../../util/link";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { ConfigService } from "../config/config";
import {
  Metadata,
  MetadataLanguage,
  MetadataPlatformLanguage,
  MetadataSupportPlatform,
  MetadataText,
  MetadataType,
  MetadataUrlFilesProcessingPolicy,
} from "./metadata";
import { MetadataRepository } from "./metadata.repository";
import {
  MetadataValidation,
  MetadataValidationItem,
  MetadataValidationType,
} from "./metadata.validation";

interface InitParams {
  configService: ConfigService;
  metadataRepository: MetadataRepository;
}

export class MetadataService {
  private configService: ConfigService;
  private metadataRepository: MetadataRepository;

  constructor({ configService, metadataRepository }: InitParams) {
    this.configService = configService;
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
        ignoreFocusOut: false,
      }
    );
    return selectedPlatform?.platform;
  }

  public getMetadataPath(platform: MetadataSupportPlatform): string {
    return this.metadataRepository.getMetadataPath(platform);
  }

  public getMetadataLanguagesInPlatform(
    platform: MetadataSupportPlatform
  ): MetadataLanguage[] {
    return this.metadataRepository.getLanguagesInPlatform(platform);
  }

  public getSupportMetadataLanguages(
    platform: MetadataSupportPlatform
  ): MetadataLanguage[] {
    return this.metadataRepository.getSupportLanguages(platform);
  }

  public async selectMetadataLanguages({
    platform,
    languages,
    selectedLanguages,
    excludeLanguages,
    title,
    placeHolder,
  }: {
    platform: MetadataSupportPlatform;
    languages?: MetadataLanguage[];
    selectedLanguages?: MetadataLanguage[];
    excludeLanguages?: MetadataLanguage[];
    title?: string;
    placeHolder?: string;
  }): Promise<MetadataLanguage[]> {
    const languageList =
      languages ?? this.getSupportMetadataLanguages(platform);
    const [selected, ltr, rtl] = ["Selected", "LTR", "RTL"];
    const selections = await Dialog.showSectionedPicker<
      MetadataLanguage,
      MetadataLanguage
    >({
      sectionLabelList: [selected, rtl, ltr],
      canPickMany: true,
      title: title ?? "Select Language list",
      placeHolder: placeHolder ?? "Select Language list",
      itemList: languageList.filter(
        (language) => !(excludeLanguages ?? []).includes(language)
      ),
      itemBuilder: (language) => {
        const picked = selectedLanguages?.includes(language);
        const section = selectedLanguages?.includes(language)
          ? selected
          : language.translateLanguage.isLTR
          ? ltr
          : rtl;
        return {
          section,
          item: {
            label: `${
              section === selected && !language.translateLanguage.isLTR
                ? "RTL : "
                : ""
            }${language.name} (${language.locale})`,
            picked,
          },
          data: language,
        };
      },
    });
    return selections ?? [];
  }

  public async selectPlatformLanguages({
    itemListFilter,
    excludePlatformLanguages,
    title,
    placeHolder,
    picked,
  }: {
    itemListFilter?: (
      platformLanguages: MetadataPlatformLanguage[]
    ) => MetadataPlatformLanguage[];
    excludePlatformLanguages?: {
      [platform in MetadataSupportPlatform]: MetadataLanguage[];
    };
    title?: string;
    placeHolder?: string;
    picked?: boolean;
  }): Promise<
    {
      platform: MetadataSupportPlatform;
      language: MetadataLanguage;
    }[]
  > {
    const platformLanguages: MetadataPlatformLanguage[] = [];
    for (const platform of Object.values(MetadataSupportPlatform)) {
      for (const language of this.getMetadataLanguagesInPlatform(platform)) {
        if (excludePlatformLanguages) {
          const excludePlatform = excludePlatformLanguages[platform];
          if (excludePlatform.includes(language)) {
            continue;
          }
        }
        platformLanguages.push({
          platform,
          language,
        });
      }
    }
    const selections = await Dialog.showSectionedPicker<
      MetadataPlatformLanguage,
      MetadataPlatformLanguage
    >({
      sectionLabelList: Object.keys(MetadataSupportPlatform),
      itemList: itemListFilter
        ? itemListFilter(platformLanguages)
        : platformLanguages,
      itemBuilder: (pl) => {
        return {
          section: pl.platform,
          item: {
            label: `${pl.language.name} (${pl.language.locale})`,
            picked: picked,
            language: pl,
          },
          data: pl,
        };
      },
      canPickMany: true,
      title: title ?? "Select Language list",
      placeHolder: placeHolder ?? "Select Language list",
    });
    return selections ?? [];
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
        label: `${language.name} (${language.locale})`,
        description: language.translateLanguage.isLTR ? "" : "RTL",
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

  public getExistMetadataFile(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage
  ): Metadata | undefined {
    return this.metadataRepository.getExistMetadataFile(platform, language);
  }

  public createMetadataFile(
    platform: MetadataSupportPlatform,
    language: MetadataLanguage
  ): Metadata {
    return this.metadataRepository.createMetadataFile(platform, language);
  }

  public updateMetadata(metadata: Metadata): Metadata {
    return this.metadataRepository.updateMetadata(metadata);
  }

  public updateMetadataText(filePath: string, text: string): void {
    return this.metadataRepository.updateMetadataText(filePath, text);
  }

  public async selectUrlFilesProcessingPolicy(): Promise<
    MetadataUrlFilesProcessingPolicy | undefined
  > {
    const selection = await vscode.window.showQuickPick(
      Object.entries(MetadataUrlFilesProcessingPolicy).map(
        ([label, value]) => ({
          label,
          policy: value as MetadataUrlFilesProcessingPolicy,
        })
      ),
      {
        title: "Url Files Processing Policy",
        placeHolder: "Please select a policy for handling URL files.",
        ignoreFocusOut: false,
      }
    );
    return selection?.policy;
  }

  public async selectFilesToTranslate(
    metadata: Metadata
  ): Promise<MetadataText[]> {
    const selections = await vscode.window.showQuickPick(
      metadata.dataList.map((data) => ({
        label: data.fileName,
        picked: data.text.length > 0,
        description: `${data.text.length.toLocaleString()} characters`,
        data,
      })),
      {
        title: "Select Files",
        placeHolder: "Select list of files to translate",
        ignoreFocusOut: true,
        canPickMany: true,
      }
    );
    return (selections ?? []).map((selection) => selection.data);
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

  public check(
    sourceMetadata: Metadata,
    targetMetadata: Metadata
  ): MetadataValidation {
    const exclude = this.configService.getTranslationExclude();
    return this.metadataRepository.check(
      sourceMetadata,
      targetMetadata,
      exclude
    );
  }

  public checkAll(sourceMetadata: Metadata): MetadataValidation[] {
    const validationList: MetadataValidation[] = [];
    const exclude = this.configService.getTranslationExclude();
    for (const platform of Object.values(MetadataSupportPlatform)) {
      const metadataLangauges = this.getMetadataLanguagesInPlatform(platform);
      for (const metadataLanguage of metadataLangauges) {
        const targetMetadata = this.getExistMetadataFile(
          platform,
          metadataLanguage
        );
        if (!targetMetadata) {
          continue;
        }

        const validation = this.metadataRepository.check(
          sourceMetadata,
          targetMetadata,
          exclude
        );
        validationList.push(validation);
      }
    }
    return validationList;
  }

  public async selectValidationItem({
    sectionLabelList,
    itemList,
    title,
    placeHolder,
  }: {
    sectionLabelList: string[];
    itemList: MetadataValidationItem[];
    title?: string;
    placeHolder?: string;
  }): Promise<MetadataValidationItem | undefined> {
    const selections = await Dialog.showSectionedPicker<
      MetadataValidationItem,
      MetadataValidationItem
    >({
      title: title ?? "Invalid Metadata List",
      placeHolder: placeHolder,
      canPickMany: false,
      sectionLabelList,
      itemList,
      itemBuilder: (item) => {
        return {
          section: item.sectionName,
          item: {
            label: item.targetData.fileName,
            detail: item.message ?? item.type,
            picked: false,
          },
          data: item,
        };
      },
    });
    if (!selections || selections.length === 0) {
      return;
    }
    return selections[0];
  }

  public async handleValidationItem({
    validation,
    validationItemList,
  }: {
    validation: MetadataValidationItem;
    validationItemList: MetadataValidationItem[];
  }) {
    const filePath = path.join(
      validation.targetMetadata.languagePath,
      validation.targetData.fileName
    );
    const { platform, language } = validation.targetMetadata;
    Toast.e(validation.message);
    switch (validation.type) {
      case MetadataValidationType.notExcluded:
        await this.metadataRepository.openInvalidEditor(validation);
        break;
      case MetadataValidationType.overflow:
        await Workspace.open(filePath);
        // open google translate website
        await Link.openGoogleTranslateWebsite({
          sourceLanguage: validation.targetMetadata.language.translateLanguage,
          text: validation.targetData.text,
        });
        break;
      case MetadataValidationType.required:
        await Workspace.open(filePath);
        break;
      case MetadataValidationType.invalidURL:
        await Workspace.open(filePath);
        break;
      case MetadataValidationType.notExist:
        const notExistItemList = validationItemList.filter(
          (item) => item.type === MetadataValidationType.notExist
        );
        // show create files confirm
        if (notExistItemList.length === 1) {
          // create one
          Workspace.createPath(filePath);
          const fileName = `${platform}/${language.locale}/${validation.targetData.fileName}`;
          Toast.i(`${fileName} created.`);
          await Workspace.open(filePath);
          return;
        }

        const isConfirm = Dialog.showConfirmDialog({
          title: "Create Metadata",
          placeHolder: `Do you want to create all missing ${notExistItemList.length} files?`,
        });
        if (!isConfirm) {
          // canceled
          return;
        } else {
          // confirm
          for (const item of notExistItemList) {
            Workspace.createPath(
              path.join(
                item.targetMetadata.languagePath,
                item.targetData.fileName
              )
            );
          }
          Toast.i(`${notExistItemList.length} files created.`);
          return;
        }
      case MetadataValidationType.normal:
        break;
    }
  }
}
