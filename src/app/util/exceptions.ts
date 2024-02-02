import { Cmd, cmdName } from "../command/cmd";

export class BaseException extends Error {}

export class ConfigurationRequiredException extends BaseException {}

export class APIKeyRequiredException extends BaseException {}

export class MigrationFailureException extends BaseException {
  constructor() {
    super("Failed to migrate");
  }
}

export class InvalidVersionException extends BaseException {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidArgumentsException extends BaseException {
  constructor(message: string) {
    super(message);
  }
}

export class GoogleSheetConfigRequiredException extends BaseException {
  constructor() {
    super(`Please add "googleSheet" settings.`);
  }
}

export class ConfigNotFoundException extends BaseException {
  constructor() {
    super(
      `Run the "${
        cmdName[Cmd.ArbInitialize]
      }" command to add required settings.`
    );
  }
}

export class InitializeRequiredException extends BaseException {
  constructor(className: string) {
    super(`${className} class must call an init() function before use.`);
  }
}
export class SourceArbFilePathRequiredException extends BaseException {
  constructor() {
    super(
      "Please add arbTranslator.config.sourceArbFilePath to the .vscode/settings.json file."
    );
  }
}

export class ArbFileNotFoundException extends BaseException {
  constructor() {
    super(
      "The .arb file cannot be found in the workspace. Please create an .arb file."
    );
  }
}

export class FileNotFoundException extends BaseException {
  constructor(fileName: string) {
    super(`File ${fileName} not found.`);
  }
}

export class InvalidArbFileNameException extends BaseException {
  constructor(arbFileName: string) {
    super(`The language code of ${arbFileName} is not valid.`);
  }
}

export class InvalidLanguageCodeException extends BaseException {
  constructor(languageCode: string) {
    super(`${languageCode} is invalid language code.`);
  }
}

export class TranslateLanguagesRequiredException extends BaseException {
  constructor() {
    super(`Please add translateLanguage to the .vscode/settings.json file.`);
  }
}

export class WorkspaceNotFoundException extends BaseException {
  constructor() {
    super("No workspace is opened.");
  }
}

export class TranslationFailureException extends BaseException {
  constructor(message: string) {
    super(message);
  }
}

export class JsonParseException extends BaseException {
  constructor(message: string) {
    super(message);
  }
}
