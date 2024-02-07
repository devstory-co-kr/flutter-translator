import * as fs from "fs";
import path from "path";
import { FileNotFoundException } from "../../util/exceptions";
import { JsonParser } from "../../util/json_parser";
import { Logger } from "../../util/logger";
import { Language } from "../language/language";

export class ArbRepository {
  /**
   * Return file path list in the same folder as source arb file
   * @param sourceArbFilePath
   * @returns
   * @throws FileNotFoundException
   */
  public getArbFilePathList(sourceArbFilePath: string): string[] {
    if (!fs.existsSync(sourceArbFilePath)) {
      throw new FileNotFoundException(sourceArbFilePath);
    }

    const directoryPath = path.dirname(sourceArbFilePath);
    const files = fs.readdirSync(directoryPath);
    const absoluteFilePaths = files
      .filter((file) => file.endsWith(".arb"))
      .map((file) => path.join(directoryPath, file));
    return absoluteFilePaths;
  }

  /**
   * Read arb file.
   * @param filePath
   * @returns Promise<Record<string, string>>
   * @throws FileNotFoundException
   */
  public async read(filePath: string): Promise<Record<string, string>> {
    if (!fs.existsSync(filePath)) {
      throw new FileNotFoundException(filePath);
    }

    return JsonParser.parse(filePath, {});
  }

  /**
   * Update file after it is created.
   * @param arb
   */
  public upsert(filePath: string, data: Record<string, string>) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Create file is not exist.
   * @param filePath
   * @param language
   */
  public createIfNotExist(filePath: string, language: Language) {
    if (!fs.existsSync(filePath)) {
      Logger.i(`create ${filePath} file`);
      fs.writeFileSync(
        filePath,
        JSON.stringify(
          {
            "@@locale": language.languageCode,
          },
          null,
          2
        ),
        "utf-8"
      );
    }
  }
}
