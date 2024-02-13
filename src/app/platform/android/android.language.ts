import { LanguageRepository } from "../../component/language/language.repository";
import {
  MetadataLanguage,
  PlatformLanguage,
} from "../../component/metadata/metadata";

export class AndroidLanguage implements PlatformLanguage {
  public supportLanguages: MetadataLanguage[] = [
    // Google translation not support
    // { name: "Romansh", locale: "rm", },
    {
      name: "Afrikaans",
      locale: "af",
      translateLanguage: LanguageRepository.afrikaans,
    },
    {
      name: "Albanian",
      locale: "sq",
      translateLanguage: LanguageRepository.albanian,
    },
    {
      name: "Amharic",
      locale: "am",
      translateLanguage: LanguageRepository.amharic,
    },
    {
      name: "Arabic",
      locale: "ar",
      translateLanguage: LanguageRepository.arabic,
    },
    {
      name: "Armenian",
      locale: "hy-AM",
      translateLanguage: LanguageRepository.armenian,
    },
    {
      name: "Azerbaijani",
      locale: "az-AZ",
      translateLanguage: LanguageRepository.azerbaijani,
    },
    {
      name: "Bangla",
      locale: "bn-BD",
      translateLanguage: LanguageRepository.bengali,
    },
    {
      name: "Basque",
      locale: "eu-ES",
      translateLanguage: LanguageRepository.basque,
    },
    {
      name: "Belarusian",
      locale: "be",
      translateLanguage: LanguageRepository.belarusian,
    },
    {
      name: "Bulgarian",
      locale: "bg",
      translateLanguage: LanguageRepository.bulgarian,
    },
    {
      name: "Burmese",
      locale: "my-MM",
      translateLanguage: LanguageRepository.myanmar,
    },
    {
      name: "Catalan",
      locale: "ca",
      translateLanguage: LanguageRepository.catalan,
    },
    {
      name: "Chinese (Hong Kong)",
      locale: "zh-HK",
      translateLanguage: LanguageRepository.chineseTraditional,
    },
    {
      name: "Chinese (Simplified)",
      locale: "zh-CN",
      translateLanguage: LanguageRepository.chineseSimplified,
    },
    {
      name: "Chinese (Traditional)",
      locale: "zh-TW",
      translateLanguage: LanguageRepository.chineseTraditional,
    },
    {
      name: "Croatian",
      locale: "hr",
      translateLanguage: LanguageRepository.croatian,
    },
    {
      name: "Czech",
      locale: "cs-CZ",
      translateLanguage: LanguageRepository.czech,
    },
    {
      name: "Danish",
      locale: "da-DK",
      translateLanguage: LanguageRepository.danish,
    },
    {
      name: "Dutch",
      locale: "nl-NL",
      translateLanguage: LanguageRepository.dutch,
    },
    {
      name: "English (India)",
      locale: "en-IN",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (Singapore)",
      locale: "en-SG",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (South Africa)",
      locale: "en-ZA",
      translateLanguage: LanguageRepository.english,
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
      name: "English (United Kingdom)",
      locale: "en-GB",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "English (United States)",
      locale: "en-US",
      translateLanguage: LanguageRepository.english,
    },
    {
      name: "Estonian",
      locale: "et",
      translateLanguage: LanguageRepository.estonian,
    },
    {
      name: "Filipino",
      locale: "fil",
      translateLanguage: LanguageRepository.tagalog,
    },
    {
      name: "Finnish",
      locale: "fi-FI",
      translateLanguage: LanguageRepository.finnish,
    },
    {
      name: "French (Canada)",
      locale: "fr-CA",
      translateLanguage: LanguageRepository.french,
    },
    {
      name: "French (France)",
      locale: "fr-FR",
      translateLanguage: LanguageRepository.french,
    },
    {
      name: "Galician",
      locale: "gl-ES",
      translateLanguage: LanguageRepository.galician,
    },
    {
      name: "Georgian",
      locale: "ka-GE",
      translateLanguage: LanguageRepository.georgian,
    },
    {
      name: "German",
      locale: "de-DE",
      translateLanguage: LanguageRepository.german,
    },
    {
      name: "Greek",
      locale: "el-GR",
      translateLanguage: LanguageRepository.greek,
    },
    {
      name: "Gujarati",
      locale: "gu",
      translateLanguage: LanguageRepository.gujarati,
    },
    {
      name: "Hebrew",
      locale: "iw-IL",
      translateLanguage: LanguageRepository.hebrew,
    },
    {
      name: "Hindi",
      locale: "hi-IN",
      translateLanguage: LanguageRepository.hindi,
    },
    {
      name: "Hungarian",
      locale: "hu-HU",
      translateLanguage: LanguageRepository.hungarian,
    },
    {
      name: "Icelandic",
      locale: "is-IS",
      translateLanguage: LanguageRepository.icelandic,
    },
    {
      name: "Indonesian",
      locale: "id",
      translateLanguage: LanguageRepository.indonesian,
    },
    {
      name: "Italian",
      locale: "it-IT",
      translateLanguage: LanguageRepository.italian,
    },
    {
      name: "Japanese",
      locale: "ja-JP",
      translateLanguage: LanguageRepository.japanese,
    },
    {
      name: "Kannada",
      locale: "kn-IN",
      translateLanguage: LanguageRepository.kannada,
    },
    {
      name: "Kazakh",
      locale: "kk",
      translateLanguage: LanguageRepository.kazakh,
    },
    {
      name: "Khmer",
      locale: "km-KH",
      translateLanguage: LanguageRepository.khmer,
    },
    {
      name: "Korean",
      locale: "ko-KR",
      translateLanguage: LanguageRepository.korean,
    },
    {
      name: "Kyrgyz",
      locale: "ky-KG",
      translateLanguage: LanguageRepository.kyrgyz,
    },
    { name: "Lao", locale: "lo-LA", translateLanguage: LanguageRepository.lao },
    {
      name: "Latvian",
      locale: "lv",
      translateLanguage: LanguageRepository.latvian,
    },
    {
      name: "Lithuanian",
      locale: "lt",
      translateLanguage: LanguageRepository.lithuanian,
    },
    {
      name: "Macedonian",
      locale: "mk-MK",
      translateLanguage: LanguageRepository.macedonian,
    },
    {
      name: "Malay",
      locale: "ms",
      translateLanguage: LanguageRepository.malay,
    },
    {
      name: "Malay (Malaysia)",
      locale: "ms-MY",
      translateLanguage: LanguageRepository.malay,
    },
    {
      name: "Malayalam",
      locale: "ml-IN",
      translateLanguage: LanguageRepository.malayalam,
    },
    {
      name: "Marathi",
      locale: "mr-IN",
      translateLanguage: LanguageRepository.marathi,
    },
    {
      name: "Mongolian",
      locale: "mn-MN",
      translateLanguage: LanguageRepository.mongolian,
    },
    {
      name: "Nepali",
      locale: "ne-NP",
      translateLanguage: LanguageRepository.nepali,
    },
    {
      name: "Norwegian",
      locale: "no-NO",
      translateLanguage: LanguageRepository.norwegian,
    },
    {
      name: "Persian",
      locale: "fa",
      translateLanguage: LanguageRepository.persian,
    },
    {
      name: "Persian (Arab Emirates)",
      locale: "fa-AE",
      translateLanguage: LanguageRepository.persian,
    },
    {
      name: "Persian (Afghanistan)",
      locale: "fa-AF",
      translateLanguage: LanguageRepository.persian,
    },
    {
      name: "Persian (Iran)",
      locale: "fa-IR",
      translateLanguage: LanguageRepository.persian,
    },
    {
      name: "Polish",
      locale: "pl-PL",
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
      name: "Punjabi",
      locale: "pa",
      translateLanguage: LanguageRepository.punjabi,
    },
    {
      name: "Romanian",
      locale: "ro",
      translateLanguage: LanguageRepository.romanian,
    },
    {
      name: "Russian",
      locale: "ru-RU",
      translateLanguage: LanguageRepository.russian,
    },
    {
      name: "Serbian",
      locale: "sr",
      translateLanguage: LanguageRepository.serbian,
    },
    {
      name: "Sinhala",
      locale: "si-LK",
      translateLanguage: LanguageRepository.sinhala,
    },
    {
      name: "Slovak",
      locale: "sk",
      translateLanguage: LanguageRepository.slovak,
    },
    {
      name: "Slovenian",
      locale: "sl",
      translateLanguage: LanguageRepository.slovenian,
    },
    {
      name: "Spanish (Latin America)",
      locale: "es-419",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      name: "Spanish (Spain)",
      locale: "es-ES",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      name: "Spanish (United States)",
      locale: "es-US",
      translateLanguage: LanguageRepository.spanish,
    },
    {
      name: "Swahili",
      locale: "sw",
      translateLanguage: LanguageRepository.swahili,
    },
    {
      name: "Swedish",
      locale: "sv-SE",
      translateLanguage: LanguageRepository.swedish,
    },
    {
      name: "Tamil",
      locale: "ta-IN",
      translateLanguage: LanguageRepository.tamil,
    },
    {
      name: "Telugu",
      locale: "te-IN",
      translateLanguage: LanguageRepository.telugu,
    },
    { name: "Thai", locale: "th", translateLanguage: LanguageRepository.thai },
    {
      name: "Turkish",
      locale: "tr-TR",
      translateLanguage: LanguageRepository.turkish,
    },
    {
      name: "Ukrainian",
      locale: "uk",
      translateLanguage: LanguageRepository.ukrainian,
    },
    { name: "Urdu", locale: "ur", translateLanguage: LanguageRepository.urdu },
    {
      name: "Vietnamese",
      locale: "vi",
      translateLanguage: LanguageRepository.vietnamese,
    },
    { name: "Zulu", locale: "zu", translateLanguage: LanguageRepository.zulu },
  ];
}
