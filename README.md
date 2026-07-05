# Flutter Translator

[![VSCode Badge](https://img.shields.io/badge/VSCode-Extension-007ACC?logo=visualstudiocode&logoColor=fff&style=flat&labelColor=007ACC)](https://marketplace.visualstudio.com/items?itemName=DevStory.flutter-translator)
<br>
Supports [internationalization of Flutter applications](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization) using [Google Translate](https://cloud.google.com/translate/docs/basic/translating-text).

## Wiki

- [Flutter Translator Wiki](https://deepwiki.com/devstory-co-kr/flutter-translator)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Usage](#usage)
- [Configuration](#configuration)
- [Translate](#translate)
- [Claude Code MCP](#claude_code_mcp)
- [License](#license)

## Introduction

This is a extension created based on an environment using **Flutter** and **Fastlane**.

- Support platform
  - Metadata & Changelog
    - `Android`
    - `iOS`
  - IAP (In-App Purchases)
    - `Android`
    - `iOS`
  - Xcode Strings
    - `iOS`
    - `Macos`
- Support Languages
  - [Show List](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d)
  - ARB : 133 Languages ([Google Translate](https://cloud.google.com/translate/docs/basic/discovering-supported-languages))
  - Android : 86 Languages ([PlayStore](https://support.google.com/googleplay/android-developer/answer/9844778?visit_id=638424490119108924-4187109290&rd=1#zippy=%2Cview-list-of-available-languages%2C%EC%82%AC%EC%9A%A9-%EA%B0%80%EB%8A%A5%ED%95%9C-%EC%96%B8%EC%96%B4-%EB%AA%A9%EB%A1%9D-%EB%B3%B4%EA%B8%B0) : exclude `Romansh`)
  - iOS : 39 Languages ([Fastlane Deliver](https://docs.fastlane.tools/actions/deliver/#:~:text=Tips-,Available,-language%20codes) / [AppStore](https://developer.apple.com/help/app-store-connect/reference/app-store-localizations))

## Features

- [ARB](#arb) files translation and management.
- [Metadata](#metadata) files translation and management.
- [Changelog](#changelog) files translation and management.
- [IAP](#iap) (In-App Purchases) plan files translation and validation.
- [Xcode Strings](#xcode_strings) files translation.
- [Claude Code MCP](#claude_code_mcp): translate ARB files with Claude Code using your Claude subscription.

## Usage

### Text Translate

1. Select the text you want to translate.
1. Run `Flutter Translator: Text - Translate`

### ARB

1. Configure the Flutter project localizations environment by referring to the [documentation](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization).
1. Run `Flutter Translator: ARB - Translate`

### Metadata

1. (If metadata is not set) Run `Flutter Translator: Metadata - Create`
1. Run `Flutter Translator: Metadata - Translate`
1. The folder structure below is automatically created when the command is executed. (Based on fastlane [upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/) & [deliver](https://docs.fastlane.tools/actions/deliver/))
   ```
   ├── android
   │    └── fastlane
   │        └── metadata
   │            └── android
   │                ├── en-US
   │                │   └── changelogs
   │                │       ├── full_description.txt
   │                │       ├── short_description.txt
   │                │       ├── title.txt
   │                │       └── video.txt
   │                └── ko-KR
   │                        ├── full_description.txt
   │                        ├── short_description.txt
   │                        ├── title.txt
   │                        └── video.txt
   └── ios
       └── fastlane
           └── metadata
               ├── en-US
               │   ├── description.txt
               │   ├── keywords.txt
               │   ├── marketing_url.txt
               │   ├── name.txt
               │   ├── privacy_url.txt
               │   ├── subtitle.txt
               │   └── support_url.txt
               └── ko
                   ├── description.txt
                   ├── keywords.txt
                   ├── marketing_url.txt
                   ├── name.txt
                   ├── privacy_url.txt
                   ├── subtitle.txt
                   └── support_url.txt
   ```

### Changelog

1. Run `Flutter Translator: Metadata - Create` and select languages you want to add.
1. Run `Flutter Translator: Changelog - Translate`
1. The folder structure below is automatically created when the command is executed. (Based on fastlane [upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/) & [deliver](https://docs.fastlane.tools/actions/deliver/))
   ```
   ├── android
   │    └── fastlane
   │        └── metadata
   │            └── android
   │                ├── en-US
   │                │   └── changelogs
   │                │       ├── default.txt
   │                │       ├── 1.txt
   │                │       └── 2.txt
   │                └── ko-KR
   │                    └── changelogs
   │                        ├── default.txt
   │                        ├── 1.txt
   │                        └── 2.txt
   └── ios
       └── fastlane
           └── metadata
               ├── en-US
               │   └── release_notes.txt
               └── ko
                   └── release_notes.txt
   ```

### IAP

Translate and validate In-App Purchase plan files for Android (Google Play Billing) and iOS (App Store Connect).

1. Prepare the IAP plan JSON file(s) under the platform's `fastlane/in_app_purchases` directory. For iOS, optionally place `subscription_groups.json` in the same directory to translate and validate subscription group localizations.
1. Run `Flutter Translator: IAP - Translate` to translate plan localizations (and iOS subscription group localizations) into selected target languages.
1. Run `Flutter Translator: IAP - Check` to validate that each localization's fields are within the store-allowed length limits.
   - Android limits: `title` 55 chars, `description` 200 chars, each `benefit` 40 chars (up to 4 benefits per plan).
   - iOS plan limits: `name` 35 chars, `description` 55 chars.
   - iOS subscription group limits: `name` 75 chars, `custom_app_name` 30 chars.
1. The expected folder structure is as follows. File names under `in_app_purchases` (except `subscription_groups.json`) are arbitrary (e.g. `plans.json`, or one JSON per product).
   ```
   ├── android
   │    └── fastlane
   │        └── in_app_purchases
   │            └── plans.json
   └── ios
       └── fastlane
           └── in_app_purchases
               ├── plans.json
               └── subscription_groups.json
   ```
1. Each `plans.json` contains an array of plans. Localization fields differ per platform.
   - Android (`languageCode`, `title`, `description`, optional `benefits`)
     ```json
     [
       {
         ...,
         "localizations": [
           {
             "languageCode": "en-US",
             "title": "Premium",
             "description": "Unlock all premium features.",
             "benefits": ["Ad-free", "Cloud sync"]
           }
         ]
       }
     ]
     ```
   - iOS (`locale`, `name`, `description`)
     ```json
     [
       {
         ...,
         "localizations": [
           {
             "locale": "en-US",
             "name": "Premium",
             "description": "Unlock all premium features."
           }
         ]
       }
     ]
     ```
1. `subscription_groups.json` (iOS only) contains an array of subscription groups. Each group has a `localizations` array with `locale`, `name`, and `custom_app_name` fields.
   ```json
   [
     {
       ...,
       "localizations": [
         {
           "locale": "en-US",
           "name": "Subscription group display name",
           "custom_app_name": "Custom app name" || null
         },
         {
           "locale": "ko",
           "name": "구독 그룹 표시 이름",
           "custom_app_name": "사용자 설정 이름" || null
         }
       ]
     }
   ]
   ```
1. The source language list for translation is the set of locales that appears in **every** plan and subscription group within the platform's JSON files. Add at least one common locale to every entry before running translate.
1. Target locales configured in `metadataConfig.exclude` are skipped.

### Xcode Strings

1. Refer to the [link](https://medium.com/@axmadxojaibrohimov/localizing-permissions-in-ios-app-ebe4ef72f3a0) and complete localization settings in xcode and then add the strings file.
1. Run `Flutter Translator: Xcode Strings - Translate`

### Claude Code MCP

1. Install [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) and make sure the `claude` command is on your `PATH`.
1. Run `Flutter Translator: Register Claude Code MCP`. Re-run this command whenever the extension version changes to update the registered server path.
1. Open the project folder with Claude Code and ask it to translate the ARB files. See [Claude Code MCP](#claude_code_mcp) for details.

## Configuration

It is recommended to set the configuration in the project workspace(`.vscode/settings.json`).

```
{
  "flutterTranslator.config": {
    "arbConfig": {
      "sourcePath": "ABSOLUTE_PATH/intl_en.arb",
      "exclude": ["ko", "zh_CN", "fr"],
      "prefix": "intl_",
      "custom": {
        "zh_CN": "intl_zh_Hant"
      }
    }
    "googleAuthConfig": {
      "apiKey": "YOUR_GOOGLE_API_KEY",
      "credential": "YOUR_CREDENTIAL_JSON_FILE_ABSOLUTE_PATH",
    }
    "googleSheetConfig": {
      "id": "YOUR_GOOGLE_SHEET_ID",
      "name": "YOUR_GOOGLE_SHEET_NAME",
      "exclude": ["ko", "zh_CN", "fr"]
    },
    "metadataConfig": {
      "exclude": ["ko-KR", "zh-CN"]
    },
    "changelogConfig": {
      "exclude": ["ko-KR", "zh-CN"]
    },
    "xcodeConfig": {
      "projectLanguageCode": {
        "fil.lproj": "tl"
      }
    },
    "translationConfig": {
      "useCache": true,
      "exclude": ["BRAND_NAME", "APPLICATION_NAME"],
    }
  }
}
```

- **arbConfig**
  - `sourcePath` : Absolute path to the source ARB file you want to translate.
  - `exclude` : [List of ARB language codes](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d) that you do not want to translate.
  - `prefix` : Arb common string to prepend to file name. (e.g. `intl_` : `intl_ko.arb`, `intl_hi.arb`, `intl_fr.arb`)
  - `custom` : You can customize the ARB file name for languageCode in the format `{LanguageCode: CUSTOM_NAME}` and arbFilePrefix is not applied.
- **googleAuthConfig**
  - `credential` : Absolute path to JSON key files created after creating a [service account](https://developers.google.com/workspace/guides/create-credentials?#service-account) on the Google Cloud console.
  - Create a JSON key to your service account and download it.
  - Create a Google Sheet file that will upload the ARB file and add permissions to email the service account.
- **googleSheetConfig**
  - `id` : You can find the spreadsheet ID in a Google Sheets URL: `https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit#gid=0`
  - `name` : Sheet name at the bottom of google sheet.
  - `exclude` : [List of ARB language codes](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d) that you do not want to upload.
- **metadataConfig**
  - `exclude` : [List of platform language codes](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d) that you do not want to translate.
- **changelogConfig**
  - `exclude` : [List of platform language codes](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d) that you do not want to translate.
- **xcodeConfig**
  - `projectLanguageCode`: Set the language to translate `locale.lproj` into. Enter the folder name ending with `.lproj` and the [ARB language code](https://gist.github.com/nero-angela/37984030bcc5dd0e62dc3143bb8c053d) name.
- **translationConfig**
  - `useCache` : whether to use cache When translating.
  - `exclude` : List of keywords you do not want translated (ignoring case).

## Translate

- Translate with free Google Translate API.
- Translation Rules
  - if the `key` contains `@`, it will not be translated.
  - If the `key` does not exist in the `targetARB` file, preceed with translation.
  - If the `values` retrieved from the `history` and `sourceARB` files using the `key` are different, it is determined that there has been a change and translation is performed.
  - If the `value` in the `history` file and the `value` in `sourceARB` are different, replaces the `value` of the entire `targetARB` with the translation result.
    - `.vscode/flutter-translator/history.json` : A history of the last translated sourceARB to track changes to the `sourceARB` file.
      ```
      {
        "data": {
          "@@locale": "en",
          "helloWorld": "hello world"
          "happyNewYear": "Happy new year",
        }
      }
      ```
  - Google Translator's results are stored in a cache file, and the cache is returned when the same request comes in.
    - You can turn the cache on and off using `Translation - Use Cache` command.
    - You can overwrite or create the cache from your local ARB files using the `ARB - Cache update` command. It reads every local ARB file and stores each existing translation as a cache entry, so that already-translated values are reused without calling the API.
    - `.vscode/flutter-translator/cache.json` : This is a file that caches Google Translate results.
      ```
      {
        "source languageCode": {
          "target languageCode": {
            "SHA-1 of source value" : "translated text"
          }
        }
      }
      ```
- Exclude Translation
  - If there are changes in the `sourceARB` file but you do not want to translate them, run the `Flutter Translator: ARB - Exclude Translation` command.
  - Overwrites the changed `value` of `sourceARB` with `history` so that the value is not translated.
  - However, if the `key` does not exist in the `targetARB` file, translation is performed.
- It has a built-in algorithm that evaluates translation results and selects a better translation.
  - Translation evaluation parameters
    - ARB Parameter Count
    - Number of parentheses
    - Number of line breaks
    - Number of keywords excluded from translation

## Claude Code MCP

Translate your ARB and IAP (In-App Purchase) files with [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) using your Claude subscription instead of the Google Translate API. The extension ships a built-in [MCP](https://modelcontextprotocol.io) server that exposes the same ARB and IAP logic (config, validation, cache) the extension uses, so Claude does the translating while the extension keeps writing the files.

### Setup

1. Install [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) and ensure the `claude` command is available on your `PATH`.
1. Run `Flutter Translator: Register Claude Code MCP`. This registers the bundled MCP server with Claude Code at user scope. Re-run this command whenever the extension version changes — the registered path includes the version, so it must be refreshed after every update.
1. Open the project folder with Claude Code and ask it to translate the untranslated ARB strings.

### How it works

While the project is open in VS Code, the extension runs a localhost bridge so the MCP server can reuse the extension's ARB services. Reference languages (the ones in `arbConfig.exclude`) are never translated automatically — they are only used as context. Claude Code uses these tools:

**ARB tools**

- `list_targets` : lists target languages that have untranslated strings, with the count for each.
- `start_translation` : returns one untranslated key together with every target language it is still missing in, the source string, and the matching wording from your hand-maintained reference languages so Claude can match the intended meaning, tone, and length. Claude translates that single key into all of those languages at once.
- `finish_translation` : validates placeholders, writes and caches the passing translations into each target ARB file (keeping the source key order), and returns any failing items for re-translation.

Claude Code repeats the start/finish calls one key at a time until everything is translated.

**IAP tools**

The same flow works for [IAP](#iap) plan and iOS subscription group files. The English (`en-US`) locale is the source; every other target locale is translated, and store character limits are enforced automatically.

- `list_iap_targets` : lists the fields to translate, grouped by `{ platform (android|ios), target (plans|subscriptionGroups), count }`.
- `start_iap_translation` : returns one field (`title`, `description`, Android `benefit`, `name`, or `custom_app_name`) with every target locale to translate it into, the English source, the field's store character limit, and the matching wording from your hand-maintained reference locales.
- `finish_iap_translation` : validates each value against the store character limit, writes the passing ones into the IAP JSON, and returns any failing items for re-translation.
- `check_iap_translations` : verifies every written IAP string across all files, reporting untranslated locales, over-limit fields, and `custom_app_name` inconsistencies.

> The MCP server only works while the project is open in VS Code with the Flutter Translator extension enabled, and Claude Code must be launched from inside that project folder.

## License

```
MIT License

Copyright (c) 2023 DevStory

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
