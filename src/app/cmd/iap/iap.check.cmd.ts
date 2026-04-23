import { IapService } from "../../component/iap/iap.service";

interface InitParams {
  iapService: IapService;
}

export class IAPCheckCmd {
  private iapService: IapService;

  constructor({ iapService }: InitParams) {
    this.iapService = iapService;
  }

  public async run() {
    this.iapService.checkIapFiles();
  }
}
