import { LanguageRepository } from "../../component/language/language.repository";
import { PlatformLanguage } from "../../component/metadata/metadata";

export class IOSLanguage implements PlatformLanguage {
  public supportLanguages = [
    {
      name: "Arabic",
      locale: "ar-SA",
      translateLanguage: LanguageRepository.arabic,
    },
    {
      name: "Catalan",
      locale: "ca",
      translateLanguage: LanguageRepository.catalan,
    },
    {
      name: "Chinese (Simplified)",
      locale: "zh-Hans",
      translateLanguage: LanguageRepository.chineseSimplified,
    },
    {
      name: "Chinese (Traditional)",
      locale: "zh-Hant",
      translateLanguage: LanguageRepository.chineseTraditional,
    },
    {
      name: "Croatian",
      locale: "hr",
      translateLanguage: LanguageRepository.croatian,
    },
    {
      name: "Czech",
      locale: "cs",
      translateLanguage: LanguageRepository.czech,
    },
    {
      name: "Danish",
      locale: "da",
      translateLanguage: LanguageRepository.danish,
    },
    {
      name: "Dutch",
      locale: "nl-NL",
      translateLanguage: LanguageRepository.dutch,
    },
    {
      name: "English (Australia)",
      locale: "en-AU",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (Canada)",
      locale: "en-CA",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (U.K.)",
      locale: "en-GB",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (U.S.)",
      locale: "en-US",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "Finnish",
      locale: "fi",
      translateLanguage: LanguageRepository.finnish,
    },
    {
      name: "French",
      locale: "fr-FR",
      translateLanguage: LanguageRepository.french,
    },
    {
      name: "French (Canada)",
      locale: "fr-CA",
      translateLanguage: LanguageRepository.french,
    },
    {
      name: "German",
      locale: "de-DE",
      translateLanguage: LanguageRepository.german,
    },
    {
      name: "Greek",
      locale: "el",
      translateLanguage: LanguageRepository.greek,
    },
    {
      name: "Hebrew",
      locale: "he",
      translateLanguage: LanguageRepository.hebrew,
    },
    {
      name: "Hindi",
      locale: "hi",
      translateLanguage: LanguageRepository.hindi,
    },
    {
      name: "Hungarian",
      locale: "hu",
      translateLanguage: LanguageRepository.hungarian,
    },
    {
      name: "Indonesian",
      locale: "id",
      translateLanguage: LanguageRepository.indonesian,
    },
    {
      name: "Italian",
      locale: "it",
      translateLanguage: LanguageRepository.italian,
    },
    {
      name: "Japanese",
      locale: "ja",
      translateLanguage: LanguageRepository.japanese,
    },
    {
      name: "Korean",
      locale: "ko",
      translateLanguage: LanguageRepository.korean,
    },
    {
      name: "Malay",
      locale: "ms",
      translateLanguage: LanguageRepository.malay,
    },
    {
      name: "Norwegian",
      locale: "no",
      translateLanguage: LanguageRepository.norwegian,
    },
    {
      name: "Polish",
      locale: "pl",
      translateLanguage: LanguageRepository.polish,
    },
    {
      name: "Portuguese (Brazil)",
      locale: "pt-BR",
      translateLanguage: LanguageRepository.portuguese,
    },
    {
      name: "Portuguese (Portugal)",
      locale: "pt-PT",
      translateLanguage: LanguageRepository.portuguese,
    },
    {
      name: "Romanian",
      locale: "ro",
      translateLanguage: LanguageRepository.romanian,
    },
    {
      name: "Russian",
      locale: "ru",
      translateLanguage: LanguageRepository.russian,
    },
    {
      name: "Slovak",
      locale: "sk",
      translateLanguage: LanguageRepository.slovak,
    },
    {
      name: "Spanish (Mexico)",
      locale: "es-MX",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      name: "Spanish (Spain)",
      locale: "es-ES",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      name: "Swedish",
      locale: "sv",
      translateLanguage: LanguageRepository.swedish,
    },
    { name: "Thai", locale: "th", translateLanguage: LanguageRepository.thai },
    {
      name: "Turkish",
      locale: "tr",
      translateLanguage: LanguageRepository.turkish,
    },
    {
      name: "Ukrainian",
      locale: "uk",
      translateLanguage: LanguageRepository.ukrainian,
    },
    {
      name: "Vietnamese.",
      locale: "vi",
      translateLanguage: LanguageRepository.vietnamese,
    },
  ];
}
