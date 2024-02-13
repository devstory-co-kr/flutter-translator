import { GaxiosPromise } from "gaxios";
import { JWT } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";

export interface GSheetParams {
  auth: JWT;

  // Sheet1!A1:B2 refers to the first two cells in the top two rows of Sheet1.
  // Sheet1!A:A refers to all the cells in the first column of Sheet1.
  // Sheet1!1:2 refers to the all the cells in the first two rows of Sheet1.
  // Sheet1!A5:A refers to all the cells of the first column of Sheet 1, from row 5 onward.
  // A1:B2 refers to the first two cells in the top two rows of the first visible sheet.
  // Sheet1 refers to all the cells in Sheet1.
  range: string;
  sheetId: string;
}

export interface GSheetRequestBody {
  majorDimension?: "ROWS" | "COLUMNS";
  range?: string;
  values?: any[][];
}

export interface GSheetUpsertParams extends GSheetParams {
  requestBody: GSheetRequestBody;
}

export interface GSheetClearParams extends GSheetParams {
  range: string;
}

/**
 * Google Sheet Limit : https://developers.google.com/sheets/api/limits
 * Google Sheet v4 document : https://developers.google.com/sheets/api/reference/rest
 */
export class GoogleSheetRepository {
  private getSheet(auth: JWT): sheets_v4.Sheets {
    return google.sheets({ version: "v4", auth });
  }

  public async insert({
    auth,
    sheetId,
    range,
    requestBody,
  }: GSheetUpsertParams): GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse> {
    return await this.getSheet(auth).spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "RAW",
      requestBody,
    });
  }

  public async getSpreadSheets({
    auth,
    sheetId,
  }: {
    auth: JWT;
    sheetId: string;
  }): GaxiosPromise<sheets_v4.Schema$Spreadsheet> {
    return await this.getSheet(auth).spreadsheets.get({
      spreadsheetId: sheetId,
    });
  }

  public async createSheet({
    auth,
    sheetId,
    sheetName,
  }: {
    auth: JWT;
    sheetId: string;
    sheetName: string;
  }): GaxiosPromise<sheets_v4.Schema$Spreadsheet> {
    return this.getSheet(auth).spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName },
            },
          },
        ],
      },
    });
  }

  public async clear({
    auth,
    sheetId,
    range,
  }: GSheetClearParams): GaxiosPromise<sheets_v4.Schema$ClearValuesResponse> {
    return this.getSheet(auth).spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: range,
    });
  }
}
