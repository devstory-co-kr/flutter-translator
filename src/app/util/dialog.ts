import * as vscode from "vscode";
import { Cmd } from "../cmd/cmd";
import { Link } from "./link";

type SectionLabel = string;
type SectionedPickerItem<D> = {
  section: SectionLabel;
  item: vscode.QuickPickItem;
  data: D;
};

interface PickItem<D> extends vscode.QuickPickItem {
  data?: D;
}

export class Dialog {
  public static showTargetLanguageCodeListRequiredDialog() {
    vscode.window
      .showErrorMessage(
        "Please add arbTranslator.config.targetLanguageCodeList to the .vscode/settings.json file. Please refer to the link for the target LanguageCodeList list.",
        "Link"
      )
      .then(async (answer) => {
        if (answer === "Link") {
          Link.showHomePage();
        }
      });
  }
  public static showAPIKeyRequiredDialog() {
    vscode.window
      .showErrorMessage(
        "Please add arbTranslator.config.googleAPIKey to the .vscode/settings.json file. Please refer to the document and proceed with the API setting and API Key issuance process.",
        "Open document"
      )
      .then(async (answer) => {
        if (answer === "Open document") {
          Link.show("https://cloud.google.com/translate/docs/setup");
        }
      });
  }

  public static showSourceArbPathRequiredDialog() {
    vscode.window
      .showErrorMessage(
        "Please add arbTranslator.config.sourceArbFilePath to the .vscode/settings.json file.",
        "Run ARB Initialize"
      )
      .then(async (answer) => {
        if (answer === "Run ARB Initialize") {
          vscode.commands.executeCommand(Cmd.ArbInitialize);
        }
      });
  }

  public static async showConfirmDialog({
    title,
    confirmText,
    cancelText,
    confirmDesc,
    cancelDesc,
    confirmDetail,
    cancelDetail,
  }: {
    title: string;
    confirmText?: string;
    cancelText?: string;
    confirmDesc?: string;
    cancelDesc?: string;
    confirmDetail?: string;
    cancelDetail?: string;
  }): Promise<boolean> {
    const select = await vscode.window.showQuickPick(
      <vscode.QuickPickItem[]>[
        {
          label: confirmText ?? "Yes",
          description: confirmDesc,
          detail: confirmDetail,
        },
        {
          label: cancelText ?? "No",
          description: cancelDesc,
          detail: cancelDetail,
        },
      ],
      {
        title,
        placeHolder: title,
        ignoreFocusOut: true,
      }
    );
    return select?.label === (confirmText ?? "Yes");
  }

  public static async showSectionedPicker<I, D>({
    sectionLabelList,
    itemList,
    itemBuilder,
    title,
    placeHolder,
    canPickMany,
  }: {
    sectionLabelList: SectionLabel[];
    itemList: I[];
    itemBuilder: (item: I) => SectionedPickerItem<D>;
    title?: string;
    placeHolder?: string;
    canPickMany: boolean;
  }): Promise<D[] | undefined> {
    // create section
    const sectionMap: {
      [key: SectionLabel]: PickItem<D>[];
    } = {};
    for (const sectionLabel of sectionLabelList) {
      sectionMap[sectionLabel] = [
        {
          label: sectionLabel,
          kind: vscode.QuickPickItemKind.Separator,
        },
      ];
    }

    // build items
    for (const item of itemList) {
      const result = itemBuilder(item);
      sectionMap[result.section].push({
        ...result.item,
        data: result.data,
      });
    }

    // add total to section label
    for (const sectionLabel of sectionLabelList) {
      const section = sectionMap[sectionLabel][0];
      const total = sectionMap[sectionLabel].length - 1;
      section.label = `${section.label} (${total})`;
    }

    // show quick pick
    const selectedItemOrItems = await vscode.window.showQuickPick<any>(
      Object.values(sectionMap).flat(),
      {
        title,
        placeHolder: placeHolder ?? `Total ${itemList.length}`,
        canPickMany: canPickMany,
        ignoreFocusOut: true,
      }
    );
    if (!selectedItemOrItems) {
      return selectedItemOrItems;
    } else {
      return (canPickMany ? selectedItemOrItems : [selectedItemOrItems]).map(
        (item: PickItem<I>) => item.data
      );
    }
  }
}
