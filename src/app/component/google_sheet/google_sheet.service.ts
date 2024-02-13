import { GaxiosPromise } from "gaxios";
import { sheets_v4 } from "googleapis";
import * as vscode from "vscode";
import { GoogleSheetConfigRequiredException } from "../../util/exceptions";
import { Link } from "../../util/link";
import { ConfigRepository } from "../config/config.repository";
import { GoogleAuthService } from "./google_auth.service";
import { GoogleSheetRepository } from "./google_sheet.repository";

interface InitParams {
  configRepository: ConfigRepository;
  googleAuthService: GoogleAuthService;
  googleSheetRepository: GoogleSheetRepository;
}

export class GoogleSheetService {
  private configRepository: ConfigRepository;
  private googleAuthService: GoogleAuthService;
  private googleSheetRepository: GoogleSheetRepository;
  constructor({
    configRepository,
    googleAuthService,
    googleSheetRepository,
  }: InitParams) {
    this.configRepository = configRepository;
    this.googleAuthService = googleAuthService;
    this.googleSheetRepository = googleSheetRepository;
  }

  private async getGoogleSheetId(): Promise<string> {
    const googleSheetConfig = this.configRepository.getGoogleSheetConfig();
    let id: string | undefined = googleSheetConfig.id;
    if (!id) {
      vscode.window.showInformationMessage(
        'You can find the spreadsheet ID in a Google Sheets URL : "https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit#gid=0"'
      );
      id = await vscode.window.showInputBox({
        title: "Google Sheet Id",
        placeHolder: "Please enter the google sheet id.",
        ignoreFocusOut: true,
      });
      if (!id) {
        throw new GoogleSheetConfigRequiredException(
          `Google Sheet id required.`
        );
      }

      this.configRepository.setGoogleSheetConfig({
        id,
      });
    }
    return id;
  }
  public async getGoogleSheetName(): Promise<string> {
    const googleSheetConfig = this.configRepository.getGoogleSheetConfig();
    let name: string | undefined = googleSheetConfig.name;
    if (!name) {
      name = await vscode.window.showInputBox({
        title: "Google Sheet Name",
        placeHolder: "Please enter the name of google sheet.",
        ignoreFocusOut: true,
      });
      if (!name) {
        throw new GoogleSheetConfigRequiredException(
          `Google Sheet name required.`
        );
      }

      this.configRepository.setGoogleSheetConfig({
        name,
      });
    }
    return name;
  }

  public async createSheet(): GaxiosPromise<sheets_v4.Schema$Spreadsheet> {
    const auth = await this.googleAuthService.getAuth();
    const sheetId = await this.getGoogleSheetId();
    const sheetName = await this.getGoogleSheetName();
    return this.googleSheetRepository.createSheet({
      auth,
      sheetId,
      sheetName,
    });
  }

  public async getSpreadSheet(): GaxiosPromise<sheets_v4.Schema$Spreadsheet> {
    const auth = await this.googleAuthService.getAuth();
    const sheetId = await this.getGoogleSheetId();
    return this.googleSheetRepository.getSpreadSheets({
      auth,
      sheetId,
    });
  }

  public async insert(
    values?: any[][]
  ): GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse> {
    const auth = await this.googleAuthService.getAuth();
    const sheetId = await this.getGoogleSheetId();
    const name = await this.getGoogleSheetName();
    return this.googleSheetRepository.insert({
      auth,
      sheetId,
      range: name,
      requestBody: {
        majorDimension: "COLUMNS",
        values: values,
      },
    });
  }

  public async clear() {
    const auth = await this.googleAuthService.getAuth();
    const sheetId = await this.getGoogleSheetId();
    const name = await this.getGoogleSheetName();
    return this.googleSheetRepository.clear({
      auth,
      sheetId,
      range: name,
    });
  }

  public async open() {
    const id = await this.getGoogleSheetId();
    Link.show(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=0`);
  }
}
