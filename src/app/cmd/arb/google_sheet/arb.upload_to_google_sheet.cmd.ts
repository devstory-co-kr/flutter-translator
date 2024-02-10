import * as vscode from "vscode";
import { ARBService } from "../../../component/arb/arb";
import { ARBValidationService } from "../../../component/arb/validation/arb_validation.service";
import { GoogleAuthService } from "../../../component/google_sheet/google_auth.service";
import { GoogleSheetService } from "../../../component/google_sheet/google_sheet.service";
import { LanguageService } from "../../../component/language/language.service";
import { Dialog } from "../../../util/dialog";
import { Toast } from "../../../util/toast";
import { Cmd } from "../../cmd";

interface InitParams {
  googleSheetService: GoogleSheetService;
  googleAuthService: GoogleAuthService;
  arbValidationService: ARBValidationService;
  languageService: LanguageService;
  arbService: ARBService;
}

export class ARBUploadToGoogleSheetCmd {
  private googleSheetService: GoogleSheetService;
  private googleAuthService: GoogleAuthService;
  private arbValidationService: ARBValidationService;
  private languageService: LanguageService;
  private arbService: ARBService;
  constructor({
    googleSheetService,
    googleAuthService,
    arbValidationService,
    languageService,
    arbService,
  }: InitParams) {
    this.googleSheetService = googleSheetService;
    this.googleAuthService = googleAuthService;
    this.arbValidationService = arbValidationService;
    this.languageService = languageService;
    this.arbService = arbService;
  }

  async run() {
    const sourceArb = await this.arbService.getSourceARB();

    // Select target language list to upload
    const targetLanguageList = await this.arbService.selectTargetLanguageList({
      title: "Upload To Google Sheet",
      placeHolder: "Please select the language list to upload to Google Sheet.",
    });
    if (!targetLanguageList) {
      return;
    }

    // check validation
    Toast.i("Check validation...");
    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceArb,
        targetLanguageList
      );
    if (validationResultList.length > 0) {
      // invalid
      Toast.e("Invalid translation result. Please correct it and try again.");
      return await vscode.commands.executeCommand(Cmd.ARBCheck);
    }

    // show confirm dialog
    const sheetName = await this.googleSheetService.getGoogleSheetName();
    const isOverride = await Dialog.showConfirmDialog({
      title: "Upload To Google Sheet",
      placeHolder: "Please note that existing values will be overrided.",
      confirmDesc: `Upload to "${sheetName}" sheet.`,
    });
    if (!isOverride) {
      return;
    }

    // get version
    const version = await vscode.window.showInputBox({
      title: "Please enter the version of this translation.",
      placeHolder: "e.g. 1.0.0 (The version is written in the A1 input box.)",
      ignoreFocusOut: true,
    });

    // Preparing to upload data
    Toast.i(`Preparing to upload data...`);
    const data: string[][] = [
      [
        `${version}` ?? "1.0.0",
        ...sourceArb.keys.filter((key) => !key.includes("@")),
      ],
      [
        sourceArb.language.name,
        ...sourceArb.keys.reduce<string[]>((values, key) => {
          if (!key.includes("@")) {
            values.push(sourceArb.data[key]);
          }
          return values;
        }, []),
      ],
    ];
    for (const uploadLanguage of targetLanguageList) {
      const uploadArbFilePath =
        await this.languageService.getARBPathFromLanguageCode(
          uploadLanguage.languageCode
        );
      const uploadArb = await this.arbService.getARB(uploadArbFilePath);
      data.push([
        uploadLanguage.name,
        ...uploadArb.keys.reduce<string[]>((values, key) => {
          if (!key.includes("@")) {
            values.push(uploadArb.data[key]);
          }
          return values;
        }, []),
      ]);
    }
    Toast.i(`Uploading data...`);
    const spreadSheet = await this.googleSheetService.getSpreadSheet();
    const sheet = (spreadSheet.data.sheets ?? []).filter((sheet) => {
      return sheet?.properties?.title === sheetName;
    });
    if (sheet.length === 0) {
      // create sheet
      await this.googleSheetService.createSheet();
    }

    // clear previous data
    await this.googleSheetService.clear();

    // upload
    await this.googleSheetService.insert(data);

    Toast.i(`🟢 Upload completed`);
    await vscode.commands.executeCommand(Cmd.ARBOpenGoogleSheet);
  }
}
