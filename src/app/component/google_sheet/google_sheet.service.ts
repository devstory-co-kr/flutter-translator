import { GaxiosPromise } from "gaxios";
import { sheets_v4 } from "googleapis";
import { Link } from "../../util/link";
import {
  GSheetClearParams,
  GSheetGetParams,
  GSheetUpsertParams,
  GoogleSheetRepository,
} from "./google_sheet.repository";

interface InitParams {
  googleSheetRepository: GoogleSheetRepository;
}

export class GoogleSheetService {
  private googleSheetRepository: GoogleSheetRepository;
  constructor({ googleSheetRepository }: InitParams) {
    this.googleSheetRepository = googleSheetRepository;
  }

  public insert(
    params: GSheetUpsertParams
  ): GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse> {
    return this.googleSheetRepository.insert(params);
  }

  public get(params: GSheetGetParams) {
    return this.googleSheetRepository.get(params);
  }

  public clear(params: GSheetClearParams) {
    return this.googleSheetRepository.clear(params);
  }

  public open(sheetId: string) {
    Link.show(`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`);
  }
}
