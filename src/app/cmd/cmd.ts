export enum Cmd {
  // ARB Command
  ArbInitialize = "flutter-translator.arb.initialize",
  ArbTranslate = "flutter-translator.arb.translate",
  ArbExcludeTranslation = "flutter-translator.arb.excludeTranslation",
  ArbConfigureTargetLanguageCode = "flutter-translator.arb.configureTargetLanguageCode",
  ArbCheck = "flutter-translator.arb.check",
  ArbDecodeAllHtmlEntities = "flutter-translator.arb.decodeAllHtmlEntities",
  ArbUploadToGoogleSheet = "flutter-translator.arb.uploadToGoogleSheet",
  ArbOpenGoogleSheet = "flutter-translator.arb.openGoogleSheet",
  ArbChangeKeys = "flutter-translator.arb.changeKeys",
  ArbDeleteKeys = "flutter-translator.arb.deleteKeys",
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
}

export const cmdName: Record<Cmd, string> = {
  [Cmd.ArbInitialize]: "Flutter Translator: ARB - Initialize",
  [Cmd.ArbTranslate]: "Flutter Translator: ARB - Translate",
  [Cmd.ArbCheck]: "Flutter Translator: ARB - Check",
  [Cmd.ArbExcludeTranslation]: "Flutter Translator: ARB - Exclude Translation",
  [Cmd.ArbConfigureTargetLanguageCode]:
    "Flutter Translator: ARB - Configure Target Language Code",
  [Cmd.ArbDecodeAllHtmlEntities]:
    "Flutter Translator: ARB - Decode All HTML Entities",
  [Cmd.ArbUploadToGoogleSheet]:
    "Flutter Translator: ARB - Upload To Google Sheet",
  [Cmd.ArbOpenGoogleSheet]: "Flutter Translator: ARB - Open Google Sheet",
  [Cmd.ArbChangeKeys]: "Flutter Translator: ARB - Change Keys",
  [Cmd.ArbDeleteKeys]: "Flutter Translator: ARB - Delete Keys",
  [Cmd.MetadataCreate]: "Flutter Translator: Metadata - Add Languages",
  [Cmd.MetadataTranslate]: "Flutter Translator: Metadata - Translate",
  [Cmd.MetadataCheck]: "Flutter Translator: Metadata - Check",
  [Cmd.MetadataOpen]: "Flutter Translator: Metadata - Open",
  [Cmd.ChangelogCreate]: "Flutter Translator: Changelog - Create",
  [Cmd.ChangelogTranslate]: "Flutter Translator: Changelog - Translate",
  [Cmd.ChangelogCheck]: "Flutter Translator: Changelog - Check",
  [Cmd.ChangelogOpen]: "Flutter Translator: Changelog - Open",
};
