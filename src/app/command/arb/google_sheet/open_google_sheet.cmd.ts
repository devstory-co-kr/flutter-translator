import { ConfigService } from "../../../config/config.service";
import { GoogleSheetService } from "../../../google_sheet/google_sheet.service";
import { GoogleSheetConfigRequiredException } from "../../../util/exceptions";
import { Workspace } from "../../../util/workspace";

interface InitParams {
  googleSheetService: GoogleSheetService;
  configService: ConfigService;
}

export class ArbOpenGoogleSheetCmd {
  private googleSheetService: GoogleSheetService;
  private configService: ConfigService;
  constructor({ googleSheetService, configService }: InitParams) {
    this.googleSheetService = googleSheetService;
    this.configService = configService;
  }

  async run() {
    const { googleSheet } = this.configService.config;

    if (!googleSheet || !googleSheet.id) {
      Workspace.open();
      this.configService.update({
        ...this.configService.config,
        googleSheet: {
          id: googleSheet?.id ?? "",
          name: googleSheet?.name ?? "",
          credentialFilePath: googleSheet?.credentialFilePath ?? "",
          uploadLanguageCodeList: googleSheet?.uploadLanguageCodeList ?? [],
        },
      });
      throw new GoogleSheetConfigRequiredException();
    }

    this.googleSheetService.open(googleSheet.id);
  }
}
