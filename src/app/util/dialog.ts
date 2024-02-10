import * as vscode from "vscode";

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
  public static async showConfirmDialog({
    title,
    placeHolder,
    confirmText,
    cancelText,
    confirmDesc,
    cancelDesc,
    confirmDetail,
    cancelDetail,
  }: {
    title: string;
    placeHolder?: string;
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
        placeHolder,
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
