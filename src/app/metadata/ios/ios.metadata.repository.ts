import { LanguageRepository } from "../../language/language.repository";
import { PlatformMetadataRepository } from "../metadata";

export class IOSMetadataRepository implements PlatformMetadataRepository {
  public supportLanguages = [
    { name: "Arabic", locale: "ar-SA", language: LanguageRepository.arabic },
    { name: "Catalan", locale: "ca", language: LanguageRepository.catalan },
    {
      name: "Chinese (Simplified)",
      locale: "zh-Hans",
      language: LanguageRepository.chineseSimplified,
    },
    {
      name: "Chinese (Traditional)",
      locale: "zh-Hant",
      language: LanguageRepository.chineseTraditional,
    },
    { name: "Croatian", locale: "hr", language: LanguageRepository.croatian },
    { name: "Czech", locale: "cs", language: LanguageRepository.czech },
    { name: "Danish", locale: "da", language: LanguageRepository.danish },
    { name: "Dutch", locale: "nl-NL", language: LanguageRepository.dutch },
    {
      name: "English (Australia)",
      locale: "en-AU",
      language: LanguageRepository.english,
    },
    {
      name: "English (Canada)",
      locale: "en-CA",
      language: LanguageRepository.english,
    },
    {
      name: "English (U.K.)",
      locale: "en-GB",
      language: LanguageRepository.english,
    },
    {
      name: "English (U.S.)",
      locale: "en-US",
      language: LanguageRepository.english,
    },
    { name: "Finnish", locale: "fi", language: LanguageRepository.finnish },
    { name: "French", locale: "fr-FR", language: LanguageRepository.french },
    {
      name: "French (Canada)",
      locale: "fr-CA",
      language: LanguageRepository.french,
    },
    { name: "German", locale: "de-DE", language: LanguageRepository.german },
    { name: "Greek", locale: "el", language: LanguageRepository.greek },
    { name: "Hebrew", locale: "he", language: LanguageRepository.hebrew },
    { name: "Hindi", locale: "hi", language: LanguageRepository.hindi },
    { name: "Hungarian", locale: "hu", language: LanguageRepository.hungarian },
    {
      name: "Indonesian",
      locale: "id",
      language: LanguageRepository.indonesian,
    },
    { name: "Italian", locale: "it", language: LanguageRepository.italian },
    { name: "Japanese", locale: "ja", language: LanguageRepository.japanese },
    { name: "Korean", locale: "ko", language: LanguageRepository.korean },
    { name: "Malay", locale: "ms", language: LanguageRepository.malay },
    { name: "Norwegian", locale: "no", language: LanguageRepository.norwegian },
    { name: "Polish", locale: "pl", language: LanguageRepository.polish },
    {
      name: "Portuguese (Brazil)",
      locale: "pt-BR",
      language: LanguageRepository.portuguese,
    },
    {
      name: "Portuguese (Portugal)",
      locale: "pt-PT",
      language: LanguageRepository.portuguese,
    },
    { name: "Romanian", locale: "ro", language: LanguageRepository.romanian },
    { name: "Russian", locale: "ru", language: LanguageRepository.russian },
    { name: "Slovak", locale: "sk", language: LanguageRepository.slovak },
    {
      name: "Spanish (Mexico)",
      locale: "es-MX",
      language: LanguageRepository.spanish,
    },
    {
      name: "Spanish (Spain)",
      locale: "es-ES",
      language: LanguageRepository.spanish,
    },
    { name: "Swedish", locale: "sv", language: LanguageRepository.swedish },
    { name: "Thai", locale: "th", language: LanguageRepository.thai },
    { name: "Turkish", locale: "tr", language: LanguageRepository.turkish },
    { name: "Ukrainian", locale: "uk", language: LanguageRepository.ukrainian },
    {
      name: "Vietnamese.",
      locale: "vi",
      language: LanguageRepository.vietnamese,
    },
  ];
}
