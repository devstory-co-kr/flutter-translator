import * as vscode from "vscode";
import {
  IapCheckIssue,
  IapCheckIssueType,
} from "../../component/iap/iap";
import { IapService } from "../../component/iap/iap.service";
import { Dialog } from "../../util/dialog";
import { Editor } from "../../util/editor";
import { Highlight, HighlightType } from "../../util/highlight";
import { Toast } from "../../util/toast";

interface InitParams {
  iapService: IapService;
}

export class IAPCheckCmd {
  private iapService: IapService;

  constructor({ iapService }: InitParams) {
    this.iapService = iapService;
  }

  public async run() {
    const issues = this.iapService.checkIapFiles();
    if (issues.length === 0) {
      return Toast.i("🟢 IAP Check Passed: All lengths are within limits.");
    }

    const selected = await this.selectIssue(issues);
    if (!selected) {
      return;
    }

    await this.navigateToIssue(selected);
  }

  private async selectIssue(
    issues: IapCheckIssue[]
  ): Promise<IapCheckIssue | undefined> {
    // Only show sections that actually have issues, in enum order.
    const sectionLabelList = Object.values(IapCheckIssueType).filter((type) =>
      issues.some((issue) => issue.type === type)
    );

    const selectItem = await Dialog.showSectionedPicker<
      IapCheckIssue,
      IapCheckIssue
    >({
      sectionLabelList,
      itemList: issues,
      canPickMany: false,
      title: `IAP Check Results : Total ${issues.length.toLocaleString()}`,
      placeHolder: "Please select the item you want to check.",
      itemBuilder: (issue) => ({
        section: issue.type,
        item: {
          label: `[${issue.platformTag}] ${issue.fileLabel}`,
          detail: issue.reason,
          description: issue.locale,
        },
        data: issue,
      }),
    });
    return selectItem?.[0];
  }

  private async navigateToIssue(issue: IapCheckIssue): Promise<void> {
    Highlight.clear();
    const { editor } = await Editor.open(issue.filePath, vscode.ViewColumn.One);
    if (!issue.searchAnchor) {
      return;
    }
    const position = Editor.search(editor, issue.searchAnchor);
    if (position) {
      Highlight.add(editor, HighlightType.red, position.line);
    }
  }
}
