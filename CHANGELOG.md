# [Change Log](http://keepachangelog.com/)

All notable changes to the [flutter-translator extension](https://marketplace.visualstudio.com/items?itemName=DevStory.flutter-translator) will be documented in this file.

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
### Update
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
