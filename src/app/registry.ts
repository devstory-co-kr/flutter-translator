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
  private androidMetadataLanguage: AndroidMetadataLanguage;
  private iosMetadataLanguage: IosMetadataLanguage;
  private iosXcodeLanguage: IosXcodeLanguage;

  /**
   * DataSource
   */
  private configDataSource: ConfigDataSource;
  private cacheDataSource: TranslationCacheDataSource;
  private translationDataSource: GoogleTranslationDataSource;

  /**
   * Repository
   */
  private translationCacheRepository: TranslationCacheRepository;
  private translationRepository: GoogleTranslationRepository;
  private arbValidationRepository: ARBValidationRepository;
  private historyRepository: HistoryRepository;
  private configRepository: ConfigRepository;
  private googleSheetRepository: GoogleSheetRepository;
  private versionRepository: VersionRepository;
  private metadataRepository: MetadataRepository;
  private changelogRepository: ChangelogRepository;
  private xcodeRepository: XcodeRepository;

  /**
   * Service
   */
  private configService: ConfigService;
  private historyService: HistoryService;
  private languageService: LanguageService;
  private arbService: ARBService;
  private translationService: GoogleTranslationService;
  private arbStatisticService: ARBStatisticService;
  private arbValidationService: ARBValidationService;
  private googleAuthService: GoogleAuthService;
  private googleSheetService: GoogleSheetService;
  private metadataService: MetadataService;
  private changelogService: ChangelogService;
  private xcodeService: XcodeService;

  public migrationService: MigrationService;

  /**
   * Command
   */
  public arbTranslateCmd: ARBTranslateCmd;
  public arbExcludeTranslationCmd: ARBExcludeTranslationCmd;
  public arbCheckCmd: ARBCheckCmd;
  public arbDecodeAllHtmlEntitiesCmd: ARBDecodeAllHtmlEntitiesCmd;
  public arbUploadToGoogleSheetCmd: ARBUploadToGoogleSheetCmd;
  public arbOpenGoogleSheetCmd: ARBOpenGoogleSheetCmd;
  public arbChangeKeysCmd: ARBChangeKeysCmd;
  public arbDeleteKeysCmd: ARBDeleteKeysCmd;
  public metadataCreateCmd: MetadataCreateCmd;
  public metadataDeleteCmd: MetadataDeleteCmd;
  public metadataTranslateCmd: MetadataTranslateCmd;
  public metadataCheckCmd: MetadataCheckCmd;
  public metadataOpenCmd: MetadataOpenCmd;
  public changelogCreateCmd: ChangelogCreateCmd;
  public changelogTranslateCmd: ChangelogTranslateCmd;
  public changelogCheckCmd: ChangelogCheckCmd;
  public changelogOpenCmd: ChangelogOpenCmd;
  public xcodeStringsTranslateCmd: XcodeStringsTranslateCmd;

  constructor() {
    // platform
    this.androidMetadataLanguage = new AndroidMetadataLanguage();
    this.iosMetadataLanguage = new IosMetadataLanguage();
    this.iosXcodeLanguage = new IosXcodeLanguage();

    // data source
    this.configDataSource = new ConfigDataSource();
    this.cacheDataSource = new TranslationCacheDataSource();
    this.translationDataSource = new GoogleTranslationDataSource();

    // repository
    this.translationCacheRepository = new TranslationCacheRepository({
      cacheDataSource: this.cacheDataSource,
    });
    this.translationRepository = new GoogleTranslationRepository({
      translationCacheRepository: this.translationCacheRepository,
      translationDataSource: this.translationDataSource,
    });
    this.arbValidationRepository = new ARBValidationRepository();
    this.historyRepository = new HistoryRepository();
    this.configRepository = new ConfigRepository({
      configDataSource: this.configDataSource,
    });
    this.googleSheetRepository = new GoogleSheetRepository();
    this.versionRepository = new VersionRepository();
    this.metadataRepository = new MetadataRepository({
      androidMetadataLanguage: this.androidMetadataLanguage,
      iosMetadataLanguage: this.iosMetadataLanguage,
    });
    this.changelogRepository = new ChangelogRepository({
      metadataRepository: this.metadataRepository,
    });
    this.xcodeRepository = new XcodeRepositoryImpl({
      iosXcodeLanguage: this.iosXcodeLanguage,
    });

    // service
    this.configService = new ConfigServiceImpl({
      configRepository: this.configRepository,
    });
    this.historyService = new HistoryService({
      historyRepository: this.historyRepository,
    });
    this.languageService = new LanguageService({
      configService: this.configService,
    });
    this.arbService = new ARBServiceImpl({
      languageService: this.languageService,
      configService: this.configService,
    });
    this.translationService = new GoogleTranslationService({
      translationCacheRepository: this.translationCacheRepository,
      translationRepository: this.translationRepository,
      configService: this.configService,
    });
    this.arbStatisticService = new ARBStatisticService({
      translationCacheRepository: this.translationCacheRepository,
      languageService: this.languageService,
      arbService: this.arbService,
    });
    this.arbValidationService = new ARBValidationService({
      arbService: this.arbService,
      languageService: this.languageService,
      arbValidationRepository: this.arbValidationRepository,
    });
    this.googleAuthService = new GoogleAuthService({
      configService: this.configService,
    });
    this.googleSheetService = new GoogleSheetService({
      configRepository: this.configRepository,
      googleAuthService: this.googleAuthService,
      googleSheetRepository: this.googleSheetRepository,
    });
    this.metadataService = new MetadataService({
      metadataRepository: this.metadataRepository,
    });
    this.changelogService = new ChangelogService({
      changelogRepository: this.changelogRepository,
    });
    this.xcodeService = new XcodeServiceImpl({
      xcodeRepository: this.xcodeRepository,
      languageService: this.languageService,
      configService: this.configService,
    });

    this.migrationService = new MigrationService({
      versionRepository: this.versionRepository,
    });

    // cmd
    this.arbTranslateCmd = new ARBTranslateCmd({
      arbService: this.arbService,
      historyService: this.historyService,
      languageService: this.languageService,
      translationService: this.translationService,
      arbStatisticService: this.arbStatisticService,
    });
    this.arbExcludeTranslationCmd = new ARBExcludeTranslationCmd({
      arbService: this.arbService,
      historyService: this.historyService,
    });
    this.arbCheckCmd = new ARBCheckCmd({
      arbValidationService: this.arbValidationService,
      arbService: this.arbService,
    });
    this.arbDecodeAllHtmlEntitiesCmd = new ARBDecodeAllHtmlEntitiesCmd({
      arbValidationService: this.arbValidationService,
      arbService: this.arbService,
    });
    this.arbUploadToGoogleSheetCmd = new ARBUploadToGoogleSheetCmd({
      googleSheetService: this.googleSheetService,
      googleAuthService: this.googleAuthService,
      arbValidationService: this.arbValidationService,
      languageService: this.languageService,
      arbService: this.arbService,
    });
    this.arbOpenGoogleSheetCmd = new ARBOpenGoogleSheetCmd({
      googleSheetService: this.googleSheetService,
    });
    this.arbChangeKeysCmd = new ARBChangeKeysCmd({
      historyService: this.historyService,
      arbService: this.arbService,
    });
    this.arbDeleteKeysCmd = new ARBDeleteKeysCmd({
      historyService: this.historyService,
      arbService: this.arbService,
    });
    this.metadataCreateCmd = new MetadataCreateCmd({
      metadataService: this.metadataService,
    });
    this.metadataDeleteCmd = new MetadataDeleteCmd({
      metadataService: this.metadataService,
    });
    this.metadataTranslateCmd = new MetadataTranslateCmd({
      configService: this.configService,
      metadataService: this.metadataService,
      translationService: this.translationService,
    });
    this.metadataCheckCmd = new MetadataCheckCmd({
      metadataService: this.metadataService,
    });
    this.metadataOpenCmd = new MetadataOpenCmd({
      metadataService: this.metadataService,
    });
    this.changelogCreateCmd = new ChangelogCreateCmd({
      metadataService: this.metadataService,
      changelogService: this.changelogService,
    });
    this.changelogTranslateCmd = new ChangelogTranslateCmd({
      configService: this.configService,
      metadataService: this.metadataService,
      changelogService: this.changelogService,
      translationService: this.translationService,
    });
    this.changelogCheckCmd = new ChangelogCheckCmd({
      changelogService: this.changelogService,
    });
    this.changelogOpenCmd = new ChangelogOpenCmd({
      changelogService: this.changelogService,
      metadataService: this.metadataService,
    });
    this.xcodeStringsTranslateCmd = new XcodeStringsTranslateCmd({
      xcodeService: this.xcodeService,
      translationService: this.translationService,
    });
  }

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
