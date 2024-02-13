import * as vscode from "vscode";

export class Logger {
  static name: string = "flutter-translator";
  static output = vscode.window.createOutputChannel(this.name);

  static l(message: string) {
    console.log(message);
    this.output.appendLine(message);
  }

  static i(message: string) {
    console.info(message);
    this.output.appendLine(message);
  }

  static w(message: string) {
    console.warn(message);
    this.output.appendLine(message);
  }

  static e(message: string, error?: any) {
    console.error(message, error);
    this.output.appendLine(message);
  }
}
