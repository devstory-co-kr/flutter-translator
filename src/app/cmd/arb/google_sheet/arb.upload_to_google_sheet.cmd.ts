import * as vscode from "vscode";
import { ArbService } from "../../../component/arb/arb.service";
import { ArbValidationService } from "../../../component/arb/validation/arb_validation.service";
import { ConfigService } from "../../../component/config/config.service";
import { GoogleAuthService } from "../../../component/google_sheet/google_auth.service";
import { GoogleSheetService } from "../../../component/google_sheet/google_sheet.service";
import { Language } from "../../../component/language/language";
import { LanguageService } from "../../../component/language/language.service";
import { Dialog } from "../../../util/dialog";
import { GoogleSheetConfigRequiredException } from "../../../util/exceptions";
import { Toast } from "../../../util/toast";
import { Workspace } from "../../../util/workspace";
import { Cmd } from "../../cmd";

interface InitParams {
  googleSheetService: GoogleSheetService;
  googleAuthService: GoogleAuthService;
  arbValidationService: ArbValidationService;
  languageService: LanguageService;
  configService: ConfigService;
  arbService: ArbService;
}

export class ArbUploadToGoogleSheetCmd {
  private googleSheetService: GoogleSheetService;
  private googleAuthService: GoogleAuthService;
  private arbValidationService: ArbValidationService;
  private languageService: LanguageService;
  private configService: ConfigService;
  private arbService: ArbService;
  constructor({
    googleSheetService,
    googleAuthService,
    arbValidationService,
    languageService,
    configService,
    arbService,
  }: InitParams) {
    this.googleSheetService = googleSheetService;
    this.googleAuthService = googleAuthService;
    this.arbValidationService = arbValidationService;
    this.languageService = languageService;
    this.configService = configService;
    this.arbService = arbService;
  }

  async run() {
    const { sourceArbFilePath, targetLanguageCodeList, googleSheet } =
      this.configService.config;
    const sourceArb = await this.arbService.getArb(sourceArbFilePath);

    // Select upload language code list
    const uploadLanguageCodeList =
      (await this.languageService.selectLanguageCodeList({
        excludeLanguageList: [sourceArb.language],
        picked: (languageCode) => {
          return (
            googleSheet?.uploadLanguageCodeList ?? targetLanguageCodeList
          ).includes(languageCode);
        }
      })) ?? [];
    if (!uploadLanguageCodeList) {
      return;
    }

    // check required google sheet settings
    if (
      !googleSheet ||
      !googleSheet.id ||
      !googleSheet.name ||
      !googleSheet.credentialFilePath ||
      uploadLanguageCodeList.length === 0
    ) {
      Workspace.openSettings();
      this.configService.update({
        ...this.configService.config,
        googleSheet: {
          id: googleSheet?.id ?? "",
          name: googleSheet?.name ?? "",
          credentialFilePath: googleSheet?.credentialFilePath ?? "",
          uploadLanguageCodeList,
        },
      });
      if (
        !googleSheet?.id ||
        !googleSheet?.name ||
        !googleSheet?.credentialFilePath ||
        uploadLanguageCodeList.length === 0
      ) {
        throw new GoogleSheetConfigRequiredException();
      }
    }

    // list of languages to upload
    const uploadLanguages: Language[] = uploadLanguageCodeList.map(
      (languageCode) => {
        return this.languageService.getLanguageByLanguageCode(languageCode);
      }
    );

    // check validation
    Toast.i("Check validation...");
    const validationResultList =
      await this.arbValidationService.getValidationResultList(
        sourceArb,
        uploadLanguages
      );
    if (validationResultList.length > 0) {
      // invalid
      Toast.e("Invalid translation result. Please correct it and try again.");
      return await vscode.commands.executeCommand(Cmd.ArbCheck);
    }

    // get google auth
    const auth = this.googleAuthService.getAuth(googleSheet.credentialFilePath);
    if (!auth) {
      return;
    }

    // show confirm dialog
    const isOverride = await Dialog.showConfirmDialog({
      title:
        "Would you like to upload the content of the ARB file to Google Sheets? Please note that existing values will be deleted.",
      confirmDesc: `Upload to "${googleSheet.name}" sheet.`,
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
        `v${version}` ?? "v1.0.0",
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
    for (const uploadLanguage of uploadLanguages) {
      const uploadArbFilePath =
        this.languageService.getArbFilePathFromLanguageCode(
          uploadLanguage.languageCode
        );
      const uploadArb = await this.arbService.getArb(uploadArbFilePath);
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

    // clear previous data
    await await this.googleSheetService.clear({
      auth,
      sheetId: googleSheet.id,
      range: googleSheet.name,
    });

    // upload
    await this.googleSheetService.insert({
      auth,
      sheetId: googleSheet.id,
      range: googleSheet.name,
      requestBody: {
        majorDimension: "COLUMNS",
        values: data,
      },
    });

    Toast.i(`🟢 Upload completed`);
    await vscode.commands.executeCommand(Cmd.ArbOpenGoogleSheet);
  }
}
