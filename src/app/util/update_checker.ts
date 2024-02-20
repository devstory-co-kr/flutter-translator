export class UpdateChecker {
  public static getVersion() {
    const currentVersion = require("../package.json").version;
    console.log(`currentVersion : ${currentVersion}`);
  }
}
