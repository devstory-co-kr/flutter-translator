import * as vscode from "vscode";
import { ChangelogService } from "../../component/changelog/changelog.service";
import {
  ChangelogValidation,
  ChangelogValidationType,
} from "../../component/changelog/changelog.validation";
import { Dialog } from "../../util/dialog";
import { Link } from "../../util/link";
import { Toast } from "../../util/toast";
import { Workspace } from "../../util/workspace";
import { Cmd } from "../cmd";
import { ChangelogTranslateCmdArgs } from "./changelog_translate.cmd";

interface InitParams {
  changelogService: ChangelogService;
}

export type ChangelogCheckCmdArgs = {};

export class ChangelogCheckCmd {
  private changelogService: ChangelogService;

  constructor({ changelogService }: InitParams) {
    this.changelogService = changelogService;
  }

  public async run(args?: ChangelogCheckCmdArgs) {
    const validationList = this.changelogService.getInvalidList();
    if (validationList.length === 0) {
      const buildNumber = this.changelogService.getBuildBumber();
      Toast.i(
        `🟢 Changelogs were all written at BuildNumber "${buildNumber}". In iOS, it is impossible to check whether it is the current version of the changelog.`
      );
      return;
    }

    const sectionLabelList: string[] = [];
    for (const validation of validationList) {
      const platform = validation.changelog.platform.toString();
      if (!sectionLabelList.includes(platform)) {
        sectionLabelList.push(platform);
      }
    }

    const selection = await Dialog.showSectionedPicker<
      ChangelogValidation,
      ChangelogValidation
    >({
      canPickMany: false,
      sectionLabelList,
      itemList: validationList,
      itemBuilder: (validation) => {
        const language = validation.changelog.language;
        return {
          section: validation.changelog.platform.toString(),
          item: {
            label: language.locale,
            description: validation.validationType,
          },
          data: validation,
          title: "Invalid Changelogs",
          placeHolder: "Please select the changelog to fix it.",
        };
      },
    });
    if (!selection) {
      return;
    }

    const validation = selection[0];
    const { filePath, language, file } = validation.changelog;
    switch (validation.validationType) {
      case ChangelogValidationType.empty:
      case ChangelogValidationType.notExist:
        const translateRequiredItemList = validationList.filter((item) =>
          [
            ChangelogValidationType.notExist,
            ChangelogValidationType.empty,
          ].includes(item.validationType)
        );
        const selections = await vscode.window.showQuickPick(
          translateRequiredItemList.map((item) => {
            const label = `${item.changelog.platform} / ${item.changelog.language.locale} / ${item.changelog.file.fileName}`;
            return {
              label,
              description: item.validationType,
              picked: true,
              item,
            };
          }),
          {
            title: `Do you want to create and translate all ${translateRequiredItemList.length} changelogs?`,
            canPickMany: true,
            ignoreFocusOut: true,
          }
        );
        if (!selections) {
          return;
        }

        const selectedValidations = selections.map(
          (selection) => selection.item
        );
        // create and translate
        await vscode.commands.executeCommand(Cmd.ChangelogTranslate, <
          ChangelogTranslateCmdArgs
        >{
          targetPlatformLanguages: selectedValidations.map((v) => ({
            platform: v.changelog.platform,
            language: v.changelog.language,
          })),
        });
        return;
      case ChangelogValidationType.overflow:
        await Workspace.open(filePath);
        const currentLength = file.text.length;
        const maxLength = file.maxLength;
        const overflow = currentLength - maxLength;
        Toast.e(
          `Characters overflow (max: ${maxLength.toLocaleString()} / current: ${currentLength} / overflow: ${overflow.toLocaleString()})`
        );

        // open google translate website
        await Link.openGoogleTranslateWebsite({
          sourceLanguage: language.translateLanguage,
          text: file.text,
        });
        break;
      case ChangelogValidationType.normal:
        break;
    }
  }
}
