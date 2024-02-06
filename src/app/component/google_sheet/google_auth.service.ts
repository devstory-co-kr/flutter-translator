import * as fs from "fs";
import { JWT, JWTInput } from "google-auth-library";
import { google } from "googleapis";
import { Toast } from "../../util/toast";

export class GoogleAuthService {
  private getCredential(credentialFilePath: string): JWTInput | undefined {
    if (!fs.existsSync(credentialFilePath)) {
      Toast.e(`There is not ${credentialFilePath} file.`);
    }
    const credentialContent = fs.readFileSync(credentialFilePath, "utf-8");
    const credential: JWTInput = JSON.parse(credentialContent);
    return credential;
  }

  public getAuth(credentialFilePath: string): JWT | undefined {
    const credential = this.getCredential(credentialFilePath);
    if (!credential) {
      return;
    }

    return new google.auth.JWT({
      email: credential.client_email,
      key: credential.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }
}
