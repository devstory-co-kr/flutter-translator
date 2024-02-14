export enum Cmd {
  // ARB Command
  ARBTranslate = "flutter-translator.arb.translate",
  ARBExcludeTranslation = "flutter-translator.arb.excludeTranslation",
  ARBCheck = "flutter-translator.arb.check",
  ARBChangeKeys = "flutter-translator.arb.changeKeys",
  ARBDeleteKeys = "flutter-translator.arb.deleteKeys",
  ARBDecodeAllHtmlEntities = "flutter-translator.arb.decodeAllHtmlEntities",
  ARBUploadToGoogleSheet = "flutter-translator.arb.uploadToGoogleSheet",
  ARBOpenGoogleSheet = "flutter-translator.arb.openGoogleSheet",
  // Metadata Command
  MetadataCreate = "flutter-translator.metadata.create",
  MetadataTranslate = "flutter-translator.metadata.translate",
  MetadataCheck = "flutter-translator.metadata.check",
  MetadataOpen = "flutter-translator.metadata.open",
  // Changelog Command
  ChangelogCreate = "flutter-translator.changelog.create",
  ChangelogTranslate = "flutter-translator.changelog.translate",
  ChangelogCheck = "flutter-translator.changelog.check",
  ChangelogOpen = "flutter-translator.changelog.open",
  // Xcode Strings Command
  XcodeStringsTranslate = "flutter-translator.xcodeStrings.translate",
}

export const cmdName: Record<Cmd, string> = {
  // ARB Command
  [Cmd.ARBTranslate]: "Flutter Translator: ARB - Translate",
  [Cmd.ARBCheck]: "Flutter Translator: ARB - Check",
  [Cmd.ARBExcludeTranslation]: "Flutter Translator: ARB - Exclude Translation",
  [Cmd.ARBDecodeAllHtmlEntities]:
    "Flutter Translator: ARB - Decode All HTML Entities",
  [Cmd.ARBUploadToGoogleSheet]:
    "Flutter Translator: ARB - Upload To Google Sheet",
  [Cmd.ARBOpenGoogleSheet]: "Flutter Translator: ARB - Open Google Sheet",
  [Cmd.ARBChangeKeys]: "Flutter Translator: ARB - Change Keys",
  [Cmd.ARBDeleteKeys]: "Flutter Translator: ARB - Delete Keys",
  // Metadata Command
  [Cmd.MetadataCreate]: "Flutter Translator: Metadata - Create",
  [Cmd.MetadataTranslate]: "Flutter Translator: Metadata - Translate",
  [Cmd.MetadataCheck]: "Flutter Translator: Metadata - Check",
  [Cmd.MetadataOpen]: "Flutter Translator: Metadata - Open",
  // Changelog Command
  [Cmd.ChangelogCreate]: "Flutter Translator: Changelog - Create",
  [Cmd.ChangelogTranslate]: "Flutter Translator: Changelog - Translate",
  [Cmd.ChangelogCheck]: "Flutter Translator: Changelog - Check",
  [Cmd.ChangelogOpen]: "Flutter Translator: Changelog - Open",
  // Xcode Strings Command
  [Cmd.XcodeStringsTranslate]: "Flutter Translator: Xcode Strings - Translate",
};
