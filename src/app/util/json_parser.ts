import * as fs from "fs";
import { JsonParseException } from "./exceptions";

export class JsonParser {
  public static async parse<T>(
    filePath: string,
    defaultValue: any
  ): Promise<T> {
    try {
      const jsonString = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(
        jsonString.trim() ? `${jsonString}` : JSON.stringify(defaultValue)
      );
    } catch (e: any) {
      throw new JsonParseException(`${filePath} : ${e.message}`);
    }
  }
}
