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
  MetadataAddLanguages = "flutter-translator.metadata.addLanguages",
  MetadataEditLanguage = "flutter-translator.metadata.editLanguage",
  MetadataTranslate = "flutter-translator.metadata.translate",
  MetadataCheck = "flutter-translator.metadata.check",
  MetadataOpen = "flutter-translator.metadata.open",
  // Changelog Command
  ChangelogCreate = "flutter-translator.changelog.create",
  ChangelogTranslate = "flutter-translator.changelog.translate",
  ChangelogCheck = "flutter-translator.changelog.check",
}

export const cmdName: Record<Cmd, string> = {
  [Cmd.ArbInitialize]: "Flutter Translator: Arb - Initialize",
  [Cmd.ArbTranslate]: "Flutter Translator: Arb - Translate",
  [Cmd.ArbCheck]: "Flutter Translator: Arb - Check",
  [Cmd.ArbExcludeTranslation]: "Flutter Translator: Arb - Exclude Translation",
  [Cmd.ArbConfigureTargetLanguageCode]:
    "Flutter Translator: Arb - Configure Target Language Code",
  [Cmd.ArbDecodeAllHtmlEntities]:
    "Flutter Translator: Arb - Decode All HTML Entities",
  [Cmd.ArbUploadToGoogleSheet]:
    "Flutter Translator: Arb - Upload To Google Sheet",
  [Cmd.ArbOpenGoogleSheet]: "Flutter Translator: Arb - Open Google Sheet",
  [Cmd.ArbChangeKeys]: "Flutter Translator: Arb - Change Keys",
  [Cmd.ArbDeleteKeys]: "Flutter Translator: Arb - Delete Keys",
  [Cmd.MetadataAddLanguages]: "Flutter Translator: Metadata - Add Languages",
  [Cmd.MetadataEditLanguage]: "Flutter Translator: Metadata - Edit Language",
  [Cmd.MetadataTranslate]: "Flutter Translator: Metadata - Translate",
  [Cmd.MetadataCheck]: "Flutter Translator: Metadata - Check",
  [Cmd.MetadataOpen]: "Flutter Translator: Metadata - Open",
  [Cmd.ChangelogCreate]: "Flutter Translator: Changelog - Create",
  [Cmd.ChangelogTranslate]: "Flutter Translator: Changelog - Translate",
  [Cmd.ChangelogCheck]: "Flutter Translator: Changelog - Check",
};
