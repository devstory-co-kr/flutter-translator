import * as fs from "fs";
import { JWT, JWTInput } from "google-auth-library";
import { google } from "googleapis";
import { ConfigService } from "../config/config";

interface InitParams {
  configService: ConfigService;
}

export class GoogleAuthService {
  private configService: ConfigService;
  constructor({ configService }: InitParams) {
    this.configService = configService;
  }

  private async getCredential(): Promise<JWTInput> {
    const credential = await this.configService.getGoogleAuthCredential();
    const credentialData = fs.readFileSync(credential, "utf-8");
    const jwt: JWTInput = JSON.parse(credentialData);
    return jwt;
  }

  public async getAuth(): Promise<JWT> {
    const credential = await this.getCredential();
    return new google.auth.JWT({
      email: credential.client_email,
      key: credential.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
}
