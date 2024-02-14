import { LanguageRepository } from "../../component/language/language.repository";
import { XcodeLanguage } from "../../component/xcode/xcode";
import { PlatformXcodeLanguage } from "../platform";

export class IosXcodeLanguage implements PlatformXcodeLanguage {
  public supportXcodeLanguages: XcodeLanguage[] = [
    {
      locale: "af",
      name: "Afrikaans",
      translateLanguage: LanguageRepository.afrikaans,
    },
    {
      locale: "am",
      name: "Amharic",
      translateLanguage: LanguageRepository.amharic,
    },
    {
      locale: "ar",
      name: "Arabic",
      translateLanguage: LanguageRepository.arabic,
    },
    {
      locale: "as",
      name: "Assamese",
      translateLanguage: LanguageRepository.assamese,
    },
    {
      locale: "az",
      name: "Azerbaijani",
      translateLanguage: LanguageRepository.azerbaijani,
    },
    {
      locale: "be",
      name: "Belarusian",
      translateLanguage: LanguageRepository.belarusian,
    },
    {
      locale: "bg",
      name: "Bulgarian",
      translateLanguage: LanguageRepository.bulgarian,
    },
    {
      locale: "bn",
      name: "Bengali",
      translateLanguage: LanguageRepository.bengali,
    },
    {
      locale: "bs",
      name: "Bosnian",
      translateLanguage: LanguageRepository.bosnian,
    },
    {
      locale: "ca",
      name: "Catalan",
      translateLanguage: LanguageRepository.catalan,
    },
    {
      locale: "cs",
      name: "Czech",
      translateLanguage: LanguageRepository.czech,
    },
    {
      locale: "cy",
      name: "Welsh",
      translateLanguage: LanguageRepository.welsh,
    },
    {
      locale: "da",
      name: "Danish",
      translateLanguage: LanguageRepository.danish,
    },
    {
      locale: "de",
      name: "German",
      translateLanguage: LanguageRepository.german,
    },
    {
      locale: "el",
      name: "Greek",
      translateLanguage: LanguageRepository.greek,
    },
    {
      locale: "en",
      name: "English",
      translateLanguage: LanguageRepository.english,
    },
    {
      locale: "es",
      name: "Spanish",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      locale: "et",
      name: "Estonian",
      translateLanguage: LanguageRepository.estonian,
    },
    {
      locale: "eu",
      name: "Basque",
      translateLanguage: LanguageRepository.basque,
    },
    {
      locale: "fi",
      name: "Finnish",
      translateLanguage: LanguageRepository.finnish,
    },
    {
      locale: "fil",
      name: "Filipino",
      translateLanguage: LanguageRepository.tagalog,
    },
    {
      locale: "fr",
      name: "French",
      translateLanguage: LanguageRepository.french,
    },
    {
      locale: "gl",
      name: "Galician",
      translateLanguage: LanguageRepository.galician,
    },
    {
      locale: "gu",
      name: "Gujarati",
      translateLanguage: LanguageRepository.gujarati,
    },
    {
      locale: "hi",
      name: "Hindi",
      translateLanguage: LanguageRepository.hindi,
    },
    {
      locale: "hr",
      name: "Croatian",
      translateLanguage: LanguageRepository.croatian,
    },
    {
      locale: "hu",
      name: "Hungarian",
      translateLanguage: LanguageRepository.hungarian,
    },
    {
      locale: "hy",
      name: "Armenian",
      translateLanguage: LanguageRepository.armenian,
    },
    {
      locale: "id",
      name: "Indonesian",
      translateLanguage: LanguageRepository.indonesian,
    },
    {
      locale: "is",
      name: "Icelandic",
      translateLanguage: LanguageRepository.icelandic,
    },
    {
      locale: "it",
      name: "Italian",
      translateLanguage: LanguageRepository.italian,
    },
    {
      locale: "ja",
      name: "Japanese",
      translateLanguage: LanguageRepository.japanese,
    },
    {
      locale: "ka",
      name: "Georgian",
      translateLanguage: LanguageRepository.georgian,
    },
    {
      locale: "kk",
      name: "Kazakh",
      translateLanguage: LanguageRepository.kazakh,
    },
    {
      locale: "km",
      name: "Khmer",
      translateLanguage: LanguageRepository.khmer,
    },
    {
      locale: "kn",
      name: "Kannada",
      translateLanguage: LanguageRepository.kannada,
    },
    {
      locale: "ko",
      name: "Korean",
      translateLanguage: LanguageRepository.korean,
    },
    {
      locale: "ky",
      name: "Kyrgyz",
      translateLanguage: LanguageRepository.kyrgyz,
    },
    { locale: "lo", name: "Lao", translateLanguage: LanguageRepository.lao },
    {
      locale: "lt",
      name: "Lithuanian",
      translateLanguage: LanguageRepository.lithuanian,
    },
    {
      locale: "lv",
      name: "Latvian",
      translateLanguage: LanguageRepository.latvian,
    },
    {
      locale: "mk",
      name: "Macedonian",
      translateLanguage: LanguageRepository.macedonian,
    },
    {
      locale: "ml",
      name: "Malayalam",
      translateLanguage: LanguageRepository.malayalam,
    },
    {
      locale: "mn",
      name: "Mongolian",
      translateLanguage: LanguageRepository.mongolian,
    },
    {
      locale: "ms",
      name: "Malay",
      translateLanguage: LanguageRepository.malay,
    },
    {
      locale: "my",
      name: "Burmese",
      translateLanguage: LanguageRepository.myanmar,
    },
    {
      locale: "nb",
      name: "Norwegian",
      translateLanguage: LanguageRepository.norwegian,
    },
    {
      locale: "ne",
      name: "Nepali",
      translateLanguage: LanguageRepository.nepali,
    },
    {
      locale: "nl",
      name: "Dutch",
      translateLanguage: LanguageRepository.dutch,
    },
    { locale: "or", name: "Odia", translateLanguage: LanguageRepository.odia },
    {
      locale: "pa",
      name: "Punjabi",
      translateLanguage: LanguageRepository.punjabi,
    },
    {
      locale: "pl",
      name: "Polish",
      translateLanguage: LanguageRepository.polish,
    },
    {
      locale: "pt",
      name: "Portuguese",
      translateLanguage: LanguageRepository.portuguese,
    },
    {
      locale: "ro",
      name: "Romanian",
      translateLanguage: LanguageRepository.romanian,
    },
    {
      locale: "ru",
      name: "Russian",
      translateLanguage: LanguageRepository.russian,
    },
    {
      locale: "si",
      name: "Sinhala",
      translateLanguage: LanguageRepository.sinhala,
    },
    {
      locale: "sk",
      name: "Slovak",
      translateLanguage: LanguageRepository.slovak,
    },
    {
      locale: "sl",
      name: "Slovenian",
      translateLanguage: LanguageRepository.slovenian,
    },
    {
      locale: "sq",
      name: "Albanian",
      translateLanguage: LanguageRepository.albanian,
    },
    {
      locale: "sr",
      name: "Serbian",
      translateLanguage: LanguageRepository.serbian,
    },
    {
      locale: "sv",
      name: "Swedish",
      translateLanguage: LanguageRepository.swedish,
    },
    {
      locale: "sw",
      name: "Swahili",
      translateLanguage: LanguageRepository.swahili,
    },
    {
      locale: "ta",
      name: "Tamil",
      translateLanguage: LanguageRepository.tamil,
    },
    {
      locale: "te",
      name: "Telugu",
      translateLanguage: LanguageRepository.telugu,
    },
    { locale: "th", name: "Thai", translateLanguage: LanguageRepository.thai },
    {
      locale: "tr",
      name: "Turkish",
      translateLanguage: LanguageRepository.turkish,
    },
    {
      locale: "uk",
      name: "Ukrainian",
      translateLanguage: LanguageRepository.ukrainian,
    },
    {
      locale: "uz",
      name: "Uzbek",
      translateLanguage: LanguageRepository.uzbek,
    },
    {
      locale: "vi",
      name: "Vietnamese",
      translateLanguage: LanguageRepository.vietnamese,
    },
    {
      locale: "zh-Hans",
      name: "Chinese Simplified",
      translateLanguage: LanguageRepository.chineseSimplified,
    },
    {
      locale: "zh-Hant",
      name: "Chinese Traditional",
      translateLanguage: LanguageRepository.chineseTraditional,
    },
    { locale: "zu", name: "Zulu", translateLanguage: LanguageRepository.zulu },
  ];
}
