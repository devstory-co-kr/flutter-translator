import { GoogleSheetService } from "../../../component/google_sheet/google_sheet.service";

interface InitParams {
  googleSheetService: GoogleSheetService;
}

export class ARBOpenGoogleSheetCmd {
  private googleSheetService: GoogleSheetService;
  constructor({ googleSheetService }: InitParams) {
    this.googleSheetService = googleSheetService;
  }

  async run() {
    await this.googleSheetService.open();
  }
}
