import { ARBCheckCmd } from "./cmd/arb/check/arb.check.cmd";
import { ARBDecodeAllHtmlEntitiesCmd } from "./cmd/arb/check/arb.decode_all_html_entities.cmd";
import { ARBExcludeTranslationCmd } from "./cmd/arb/configure/arb.exclude_translation.cmd";
import { ARBOpenGoogleSheetCmd } from "./cmd/arb/google_sheet/arb.open_google_sheet.cmd";
import { ARBUploadToGoogleSheetCmd } from "./cmd/arb/google_sheet/arb.upload_to_google_sheet.cmd";
import { ARBChangeKeysCmd } from "./cmd/arb/keys/arb.change_keys.cmd";
import { ARBDeleteKeysCmd } from "./cmd/arb/keys/arb.delete_keys.cmd";
import { ARBTranslateCmd } from "./cmd/arb/translate/arb.translate.cmd";
import { ChangelogCheckCmd } from "./cmd/changelog/changelog.check.cmd";
import { ChangelogCreateCmd } from "./cmd/changelog/changelog.create.cmd";
import { ChangelogOpenCmd } from "./cmd/changelog/changelog.open.cmd";
import { ChangelogTranslateCmd } from "./cmd/changelog/changelog.translate.cmd";
import { MetadataCheckCmd } from "./cmd/metadata/metadata.check.cmd";
import { MetadataCreateCmd } from "./cmd/metadata/metadata.create.cmd";
import { MetadataDeleteCmd } from "./cmd/metadata/metadata.delete.cmd";
import { MetadataOpenCmd } from "./cmd/metadata/metadata.open.cmd";
import { MetadataTranslateCmd } from "./cmd/metadata/metadata.translate.cmd";
import { TranslationExcludeCmd } from "./cmd/translation/translation.exclude.cmd";
import { TranslationTranslateCmd } from "./cmd/translation/translation.translate.cmd";
import { XcodeStringsTranslateCmd } from "./cmd/xcode_strings/xcode_strings.translate.cmd";
import { ARBService } from "./component/arb/arb";
import { ARBServiceImpl } from "./component/arb/arb.service";
import { ARBStatisticService } from "./component/arb/statistic/arb_statistic.service";
import { ARBValidationRepository } from "./component/arb/validation/arb_validation.repository";
import { ARBValidationService } from "./component/arb/validation/arb_validation.service";
import { ChangelogRepository } from "./component/changelog/changelog.repositoroy";
import { ChangelogService } from "./component/changelog/changelog.service";
import { ConfigService } from "./component/config/config";
import { ConfigDataSource } from "./component/config/config.datasource";
import { ConfigRepository } from "./component/config/config.repository";
import { ConfigServiceImpl } from "./component/config/config.service";
import { GoogleAuthService } from "./component/google_sheet/google_auth.service";
import { GoogleSheetRepository } from "./component/google_sheet/google_sheet.repository";
import { GoogleSheetService } from "./component/google_sheet/google_sheet.service";
import { HistoryRepository } from "./component/history/history.repository";
import { HistoryService } from "./component/history/history.service";
import { LanguageService } from "./component/language/language.service";
import { MetadataRepository } from "./component/metadata/metadata.repository";
import { MetadataService } from "./component/metadata/metadata.service";
import { MigrationService } from "./component/migration/migration.service";
import { VersionRepository } from "./component/migration/version.repository";
import { TranslationCacheDataSource } from "./component/translation/cache/translation_cache.datasource";
import { TranslationCacheRepository } from "./component/translation/cache/translation_cache.repository";
import { GoogleTranslationDataSource } from "./component/translation/google/google_translation.datasource";
import { GoogleTranslationRepository } from "./component/translation/google/google_translation.repository";
import { GoogleTranslationService } from "./component/translation/google/google_translation.service";
import { XcodeRepository, XcodeService } from "./component/xcode/xcode";
import { XcodeRepositoryImpl } from "./component/xcode/xcode.repository";
import { XcodeServiceImpl } from "./component/xcode/xcode.service";
import { AndroidMetadataLanguage } from "./platform/android/android.metadata_language";
import { IosMetadataLanguage } from "./platform/ios/ios.metadata_language";
import { IosXcodeLanguage } from "./platform/ios/ios.strings_language";

export class Registry {
  /**
   * Platform
   */
  private androidMetadataLanguage: AndroidMetadataLanguage =
    new AndroidMetadataLanguage();
  private iosMetadataLanguage: IosMetadataLanguage = new IosMetadataLanguage();
  private iosXcodeLanguage: IosXcodeLanguage = new IosXcodeLanguage();

  /**
   * DataSource
   */
  private configDataSource: ConfigDataSource = new ConfigDataSource();
  private cacheDataSource: TranslationCacheDataSource =
    new TranslationCacheDataSource();
  private translationDataSource: GoogleTranslationDataSource =
    new GoogleTranslationDataSource();

  /**
   * Repository
   */
  private translationCacheRepository: TranslationCacheRepository =
    new TranslationCacheRepository({ cacheDataSource: this.cacheDataSource });
  private translationRepository: GoogleTranslationRepository =
    new GoogleTranslationRepository({
      translationCacheRepository: this.translationCacheRepository,
      translationDataSource: this.translationDataSource,
    });
  private arbValidationRepository: ARBValidationRepository =
    new ARBValidationRepository();
  private historyRepository: HistoryRepository = new HistoryRepository();
  private configRepository: ConfigRepository = new ConfigRepository({
    configDataSource: this.configDataSource,
  });
  private googleSheetRepository: GoogleSheetRepository =
    new GoogleSheetRepository();
  private versionRepository: VersionRepository = new VersionRepository();
  private metadataRepository: MetadataRepository = new MetadataRepository({
    androidMetadataLanguage: this.androidMetadataLanguage,
    iosMetadataLanguage: this.iosMetadataLanguage,
  });
  private changelogRepository: ChangelogRepository = new ChangelogRepository({
    metadataRepository: this.metadataRepository,
  });
  private xcodeRepository: XcodeRepository = new XcodeRepositoryImpl({
    iosXcodeLanguage: this.iosXcodeLanguage,
  });

  /**
   * Service
   */
  private configService: ConfigService = new ConfigServiceImpl({
    configRepository: this.configRepository,
  });
  private historyService: HistoryService = new HistoryService({
    historyRepository: this.historyRepository,
  });
  private languageService: LanguageService = new LanguageService({
    configService: this.configService,
  });
  private arbService: ARBService = new ARBServiceImpl({
    languageService: this.languageService,
    configService: this.configService,
  });
  private translationService: GoogleTranslationService =
    new GoogleTranslationService({
      translationCacheRepository: this.translationCacheRepository,
      translationRepository: this.translationRepository,
      configService: this.configService,
    });
  private arbStatisticService: ARBStatisticService = new ARBStatisticService({
    translationCacheRepository: this.translationCacheRepository,
    languageService: this.languageService,
    arbService: this.arbService,
  });
  private arbValidationService: ARBValidationService = new ARBValidationService(
    {
      arbService: this.arbService,
      languageService: this.languageService,
      arbValidationRepository: this.arbValidationRepository,
    }
  );
  private googleAuthService: GoogleAuthService = new GoogleAuthService({
    configService: this.configService,
  });
  private googleSheetService: GoogleSheetService = new GoogleSheetService({
    configRepository: this.configRepository,
    googleAuthService: this.googleAuthService,
    googleSheetRepository: this.googleSheetRepository,
  });
  private metadataService: MetadataService = new MetadataService({
    metadataRepository: this.metadataRepository,
  });
  private changelogService: ChangelogService = new ChangelogService({
    changelogRepository: this.changelogRepository,
  });
  private xcodeService: XcodeService = new XcodeServiceImpl({
    xcodeRepository: this.xcodeRepository,
    languageService: this.languageService,
    configService: this.configService,
  });
  public migrationService: MigrationService = new MigrationService({
    versionRepository: this.versionRepository,
  });

  /**
   * Command
   */
  public textTranslateCmd: TranslationTranslateCmd =
    new TranslationTranslateCmd({
      translationService: this.translationService,
    });
  public arbTranslateCmd: ARBTranslateCmd = new ARBTranslateCmd({
    arbService: this.arbService,
    historyService: this.historyService,
    languageService: this.languageService,
    translationService: this.translationService,
    arbStatisticService: this.arbStatisticService,
  });
  public arbExcludeTranslationCmd: ARBExcludeTranslationCmd =
    new ARBExcludeTranslationCmd({
      arbService: this.arbService,
      historyService: this.historyService,
    });
  public arbCheckCmd: ARBCheckCmd = new ARBCheckCmd({
    arbValidationService: this.arbValidationService,
    arbService: this.arbService,
  });
  public arbDecodeAllHtmlEntitiesCmd: ARBDecodeAllHtmlEntitiesCmd =
    new ARBDecodeAllHtmlEntitiesCmd({
      arbValidationService: this.arbValidationService,
      arbService: this.arbService,
    });
  public arbUploadToGoogleSheetCmd: ARBUploadToGoogleSheetCmd =
    new ARBUploadToGoogleSheetCmd({
      googleSheetService: this.googleSheetService,
      googleAuthService: this.googleAuthService,
      arbValidationService: this.arbValidationService,
      languageService: this.languageService,
      arbService: this.arbService,
    });
  public arbOpenGoogleSheetCmd: ARBOpenGoogleSheetCmd =
    new ARBOpenGoogleSheetCmd({ googleSheetService: this.googleSheetService });
  public arbChangeKeysCmd: ARBChangeKeysCmd = new ARBChangeKeysCmd({
    historyService: this.historyService,
    arbService: this.arbService,
  });
  public arbDeleteKeysCmd: ARBDeleteKeysCmd = new ARBDeleteKeysCmd({
    historyService: this.historyService,
    arbService: this.arbService,
  });
  public metadataCreateCmd: MetadataCreateCmd = new MetadataCreateCmd({
    metadataService: this.metadataService,
  });
  public metadataDeleteCmd: MetadataDeleteCmd = new MetadataDeleteCmd({
    metadataService: this.metadataService,
  });
  public metadataTranslateCmd: MetadataTranslateCmd = new MetadataTranslateCmd({
    configService: this.configService,
    metadataService: this.metadataService,
    translationService: this.translationService,
  });
  public metadataCheckCmd: MetadataCheckCmd = new MetadataCheckCmd({
    metadataService: this.metadataService,
  });
  public metadataOpenCmd: MetadataOpenCmd = new MetadataOpenCmd({
    metadataService: this.metadataService,
  });
  public changelogCreateCmd: ChangelogCreateCmd = new ChangelogCreateCmd({
    metadataService: this.metadataService,
    changelogService: this.changelogService,
  });
  public changelogTranslateCmd: ChangelogTranslateCmd =
    new ChangelogTranslateCmd({
      configService: this.configService,
      metadataService: this.metadataService,
      changelogService: this.changelogService,
      translationService: this.translationService,
    });
  public changelogCheckCmd: ChangelogCheckCmd = new ChangelogCheckCmd({
    changelogService: this.changelogService,
  });
  public changelogOpenCmd: ChangelogOpenCmd = new ChangelogOpenCmd({
    changelogService: this.changelogService,
    metadataService: this.metadataService,
  });
  public xcodeStringsTranslateCmd: XcodeStringsTranslateCmd =
    new XcodeStringsTranslateCmd({
      xcodeService: this.xcodeService,
      translationService: this.translationService,
    });
  public translationExcludeCmd: TranslationExcludeCmd =
    new TranslationExcludeCmd({});

  public init(): Promise<void[]> {
    return Promise.all([
      this.historyRepository.init(),
      this.cacheDataSource.init(),
    ]);
  }

  public disposed() {
    this.arbValidationRepository.disposed();
  }
}
