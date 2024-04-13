# [Change Log](http://keepachangelog.com/)

All notable changes to the [flutter-translator extension](https://marketplace.visualstudio.com/items?itemName=DevStory.flutter-translator) will be documented in this file.

## [2.4.6] - 24.04.13
### Added
- Add logic to check whether ARB parameter names match.
- Add translation option.

## [2.4.5] - 24.03.29
### Added
- Add `Changelog - Delete` command.

## [2.4.4] - 24.03.23
### Updated
- Update not to save cache when translating text.

## [2.4.2] - 24.03.17
### Fixed
- Fix the url files can be selected when translating meatadata.

### Changed
- Change default cache application to off when text translating.

## [2.4.1] - 24.03.15
### Added
- Add batch to ARB translation.
- Add encoding function for HTML tags and parentheses.

## [2.4.0] - 24.03.14
### Added
- Add `Translation - Use Cache` command.
- Add re-translation function when checking ARB
- Add translation batch.

### Updated
- Update to ignore case in string translation exclusions and make exclusions even for substrings.
- Update to change the encoding key and retry if the number of encodings does not match after translation.
- Improve translation performance by adding translation evaluation function.

## [2.3.3] - 24.03.13
### Added
- Add `Google Translation - Open Web` command.

## [2.3.2] - 24.03.13
### Updated
- Update to check exclusion keywords starting from longest length.
- Update to handle translation exclusions by cutting strings based on spacing.

## [2.3.0] - 24.03.13
### Added
- Add `Translation - Exclude` command.
- Add `translationConfig.exclude` configuration.
- Add line break symbol count check logic to ARB check command.
- Add retranslate all items option to ARB check command.

### Updated
- Update to check whether translation exceptions apply when checking ARB and Metadata.

### Deleted
- Delete paid translation feature.

## [2.2.1] - 24.02.27
### Updated
- Update to select a language when accessing files that languages are not verified.

## [2.2.0] - 24.02.27
### Added
- Add `Text - Translate` command.

## [2.1.5] - 24.02.27
### Changed
- Change the source ARB file path input method.

### Fixed
- Fix config updates to be processed synchronously.

## [2.1.4] - 24.02.24
### Fixed
- Fix text direction for `Amharic(LTR)`, `Arabic(RTL)`, and `Yiddish(RTL)`.

## [2.1.3] - 24.02.20
### Added
- Add `Metadata - Delete` command.
- Add `LTR` & `RTL` indication when translating metadata.

## [2.1.2] - 24.02.20
### Added
- Add `metadataConfig.exclude` configuration.
- Add `changelogConfig.exclude` configuration.

## Changed
- Rename `xcodeConfig.custom` configuration to `xcode.projectLanguageCode`.

## [2.1.0] - 24.02.19
### Added
- Add `Xcode Strings - Translate` command.

## [2.0.0] - 24.02.13
### Changed
- Change extension name from `arb-translator` to `flutter-translator`
- Change configuration.
  - When updating, settings from version 1.3.11 will be automatically migrated.
  - Instead of `targetLanguageCodeList`, the target language for translation is detected by the list of files that accompany the `sourceARB` file.

### Added
- Add `Metadata - Create` command.
- Add `Metadata - Translate` command.
- Add `Metadata - Check` command.
- Add `Metadata - Open` command.
- Add `Changelog - Create` command.
- Add `Changelog - Translate` command.
- Add `Changelog - Check` command.
- Add `Changelog - Open` command.

## Removed
- Remove `Initialize` command.
- Remove `Configure Target Language Code` command.
- Remove `targetLanguageCodeList` from configuration.
- Remove `validateLanguageCodeList` from configuration.

## [1.3.11] - 24.01.30
### Updated
- Update to create @@locale during translation if it does not exist.
- Update to check the existence of @@locale.

## [1.3.10] - 24.01.29
### Fixed
- Fix an invalid url encoding problem.

## [1.3.8] - 24.01.24
### Updated
- Update to validate `Change Arb Keys` command.

## [1.3.6] - 24.01.24
### Updated
- Update `Change key` command to support multiple changes.
- Update `Delete key` command to support multiple deletion.

## [1.3.5] - 24.01.23
### Added
- Add `Delete key` command.

### Updated
- Update history when key changings.

## [1.3.4] - 24.01.23
### Added
- Add `Change key` command.

## [1.3.3] - 24.01.23
### Added
- Add `validateLanguageCodeList` setting.

## [1.3.2] - 24.01.18
### Added
- Add notification of progress in translation.

### Updated
- Update logic for inspecting settings in the `Upload To Google Sheet` command.

## [1.3.1] - 24.01.18
### Added
- Add `googleSheet.uploadLanguageCodeList` setting.
- Add `Open Google Sheet` command.

## [1.3.0] - 24.01.18
### Added
- Add `Upload To Google Sheet` command.

## [1.2.1] - 24.01.14

### Removed
- Remove unused HTML files.

### Fixed
- Fix command not found issue by adding a dependency.

## [1.2.0] - 24.01.14

### Added
- Add `Decode All HTML Entities` command.
- Add a check for the decoding HTML entities to the `Validate Translation` command.
- Add eslint-watch.

## [1.1.1] - 24.01.12

### Updated
- Update preview picker UI.

### Fixed
- Fix `Validation Translation` command broken issue.

## [1.1.0] - 24.01.12

### Added
- Add validation result preview.

### Updated
- Update quick pick UI.

### Fixed
- Fix the highlight remaining issue.

## [1.0.0] - 24.01.12

### Added
- Add `Initialize` command.
- Add `Translate` command.
- Add `Translation Preview` command.
- Add `Validate Translation` command.
- Add `Exclude Translation` command.
- Add `Configure Target Language Code` command.
- Add `customArbFileName` setting to customize arb file name.
- Add translation caching feature.

## [0.1.15] - 24.01.03

### Updated

- Update Chinese arb name from "zh_Hans" and "zh_Hant" to "zh_CN" and "zh_TW".

## [0.1.14] - 24.01.03

### Fixed

- Replace "&#39;" to "'".

## [0.1.13] - 24.01.03

### Updated

- Update Hebrew arb name from "iw" to "he".

## [0.1.12] - 24.01.02

### Updated

- Update Chinese arb name from "zh_CN" and "zh_TW" to "zh_Hans" and "zh_Hant".

## [0.1.11] - 24.01.02

### Updated

- Update Meiteilon arb name from "mni_Mtei" to "mni".

## [0.1.10] - 23.12.29

### Rmoved

- Filipino & Tagalog deduplication

## [0.1.9] - 23.12.29

### Fixed

- Fix so that keys containing "@" are not translated when arb file is first created.

## [0.1.8] - 23.12.27

### Added

- Support html tag.

## [0.1.7] - 23.12.19

### Added

- Support line break.
