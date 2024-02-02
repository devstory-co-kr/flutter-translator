export enum Cmd {
  // ARB Command
  ArbInitialize = "flutter-translator.arb.initialize",
  ArbTranslate = "flutter-translator.arb.translate",
  ArbExcludeTranslation = "flutter-translator.arb.excludeTranslation",
  ArbConfigureTargetLanguageCode = "flutter-translator.arb.configureTargetLanguageCode",
  ArbValidateTranslation = "flutter-translator.arb.validateTranslation",
  ArbDecodeAllHtmlEntities = "flutter-translator.arb.decodeAllHtmlEntities",
  ArbUploadToGoogleSheet = "flutter-translator.arb.uploadToGoogleSheet",
  ArbOpenGoogleSheet = "flutter-translator.arb.openGoogleSheet",
  ArbChangeKeys = "flutter-translator.arb.changeKeys",
  ArbDeleteKeys = "flutter-translator.arb.deleteKeys",
}

export const cmdName: Record<Cmd, string> = {
  [Cmd.ArbInitialize]: "Flutter Translator : [ARB] Initialize",
  [Cmd.ArbTranslate]: "Flutter Translator : [ARB] Translate",
  [Cmd.ArbValidateTranslation]:
    "Flutter Translator : [ARB] Validate Translation",
  [Cmd.ArbExcludeTranslation]: "Flutter Translator : [ARB] Exclude Translation",
  [Cmd.ArbConfigureTargetLanguageCode]:
    "Flutter Translator : [ARB] Configure Target Language Code",
  [Cmd.ArbDecodeAllHtmlEntities]:
    "Flutter Translator : [ARB] Decode All HTML Entities",
  [Cmd.ArbUploadToGoogleSheet]:
    "Flutter Translator : [ARB] Upload To Google Sheet",
  [Cmd.ArbOpenGoogleSheet]: "Flutter Translator : [ARB] Open Google Sheet",
  [Cmd.ArbChangeKeys]: "Flutter Translator : [ARB] Change Keys",
  [Cmd.ArbDeleteKeys]: "Flutter Translator : [ARB] Delete Keys",
};
