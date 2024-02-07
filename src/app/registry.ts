import { ArbInitializeCmd } from "./cmd/arb/arb.initialize.cmd";
import { ArbCheckCmd } from "./cmd/arb/check/arb.check.cmd";
import { ArbDecodeAllHtmlEntitiesCmd } from "./cmd/arb/check/arb.decode_all_html_entities.cmd";
import { ArbConfigureTargetLanguageCodeCmd } from "./cmd/arb/configure/arb.configure_target_language_code.cmd";
import { ArbExcludeTranslationCmd } from "./cmd/arb/configure/arb.exclude_translation.cmd";
import { ArbOpenGoogleSheetCmd } from "./cmd/arb/google_sheet/arb.open_google_sheet.cmd";
import { ArbUploadToGoogleSheetCmd } from "./cmd/arb/google_sheet/arb.upload_to_google_sheet.cmd";
import { ArbChangeKeysCmd } from "./cmd/arb/keys/arb.change_keys.cmd";
import { ArbDeleteKeysCmd } from "./cmd/arb/keys/arb.delete_keys.cmd";
import { ArbCreateTranslationCacheCmd } from "./cmd/arb/translate/arb.create_translation_cache.cmd";
import { ArbTranslateCmd } from "./cmd/arb/translate/arb.translate.cmd";
import { ChangelogCheckCmd } from "./cmd/changelog/changelog.check.cmd";
import { ChangelogCreateCmd } from "./cmd/changelog/changelog.create.cmd";
import { ChangelogOpenCmd } from "./cmd/changelog/changelog.open.cmd";
import { ChangelogTranslateCmd } from "./cmd/changelog/changelog.translate.cmd";
import { MetadataCheckCmd } from "./cmd/metadata/metadata.check.cmd";
import { MetadataCreateCmd } from "./cmd/metadata/metadata.create.cmd";
import { MetadataOpenCmd } from "./cmd/metadata/metadata.open.cmd";
import { MetadataTranslateCmd } from "./cmd/metadata/metadata.translate.cmd";
import { ArbService } from "./component/arb/arb.service";
import { ArbStatisticService } from "./component/arb/statistic/arb_statistic.service";
import { ArbValidationRepository } from "./component/arb/validation/arb_validation.repository";
import { ArbValidationService } from "./component/arb/validation/arb_validation.service";
import { ChangelogRepository } from "./component/changelog/changelog.repositoroy";
import { ChangelogService } from "./component/changelog/changelog.service";
import { ConfigRepository } from "./component/config/config.repository";
import { ConfigService } from "./component/config/config.service";
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

export class Registry {
  /**
   * DataSource
   */
  private cacheDataSource: TranslationCacheDataSource;
  private translationDataSource: GoogleTranslationDataSource;

  /**
   * Repository
   */
  private translationCacheRepository: TranslationCacheRepository;
  private translationRepository: GoogleTranslationRepository;
  private arbValidationRepository: ArbValidationRepository;
  private historyRepository: HistoryRepository;
  private configRepository: ConfigRepository;
  private googleSheetRepository: GoogleSheetRepository;
  private versionRepository: VersionRepository;
  private metadataRepository: MetadataRepository;
  private changelogRepository: ChangelogRepository;

  /**
   * Service
   */
  private historyService: HistoryService;
  private configService: ConfigService;
  private languageService: LanguageService;
  private arbService: ArbService;
  private translationService: GoogleTranslationService;
  private arbStatisticService: ArbStatisticService;
  private arbValidationService: ArbValidationService;
  private googleAuthService: GoogleAuthService;
  private googleSheetService: GoogleSheetService;
  private metadataService: MetadataService;
  private changelogService: ChangelogService;

  public migrationService: MigrationService;

  /**
   * Command
   */
  public arbInitializeCmd: ArbInitializeCmd;
  public arbTranslateCmd: ArbTranslateCmd;
  public arbCreateTranslationCacheCmd: ArbCreateTranslationCacheCmd;
  public arbExcludeTranslationCmd: ArbExcludeTranslationCmd;
  public arbConfigureTargetLanguageCodeCmd: ArbConfigureTargetLanguageCodeCmd;
  public arbCheckCmd: ArbCheckCmd;
  public arbDecodeAllHtmlEntitiesCmd: ArbDecodeAllHtmlEntitiesCmd;
  public arbUploadToGoogleSheetCmd: ArbUploadToGoogleSheetCmd;
  public arbOpenGoogleSheetCmd: ArbOpenGoogleSheetCmd;
  public arbChangeKeysCmd: ArbChangeKeysCmd;
  public arbDeleteKeysCmd: ArbDeleteKeysCmd;
  public metadataCreateCmd: MetadataCreateCmd;
  public metadataTranslateCmd: MetadataTranslateCmd;
  public metadataCheckCmd: MetadataCheckCmd;
  public metadataOpenCmd: MetadataOpenCmd;
  public changelogCreateCmd: ChangelogCreateCmd;
  public changelogTranslateCmd: ChangelogTranslateCmd;
  public changelogCheckCmd: ChangelogCheckCmd;
  public changelogOpenCmd: ChangelogOpenCmd;

  constructor() {
    // data source
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
    this.arbValidationRepository = new ArbValidationRepository();
    this.historyRepository = new HistoryRepository();
    this.configRepository = new ConfigRepository();
    this.googleSheetRepository = new GoogleSheetRepository();
    this.versionRepository = new VersionRepository();
    this.metadataRepository = new MetadataRepository();
    this.changelogRepository = new ChangelogRepository({
      metadataRepository: this.metadataRepository,
    });

    // service
    this.historyService = new HistoryService({
      historyRepository: this.historyRepository,
    });
    this.configService = new ConfigService({
      configRepository: this.configRepository,
    });
    this.languageService = new LanguageService({
      configService: this.configService,
    });
    this.arbService = new ArbService({ languageService: this.languageService });
    this.translationService = new GoogleTranslationService({
      translationCacheRepository: this.translationCacheRepository,
      translationRepository: this.translationRepository,
      configService: this.configService,
    });
    this.arbStatisticService = new ArbStatisticService({
      translationCacheRepository: this.translationCacheRepository,
      languageService: this.languageService,
      arbService: this.arbService,
    });
    this.arbValidationService = new ArbValidationService({
      arbService: this.arbService,
      languageService: this.languageService,
      translationService: this.translationService,
      arbValidationRepository: this.arbValidationRepository,
    });
    this.googleAuthService = new GoogleAuthService();
    this.googleSheetService = new GoogleSheetService({
      googleSheetRepository: this.googleSheetRepository,
    });
    this.migrationService = new MigrationService({
      versionRepository: this.versionRepository,
    });
    this.metadataService = new MetadataService({
      metadataRepository: this.metadataRepository,
    });
    this.changelogService = new ChangelogService({
      changelogRepository: this.changelogRepository,
    });

    // cmd
    this.arbInitializeCmd = new ArbInitializeCmd({
      configService: this.configService,
      arbService: this.arbService,
    });
    this.arbTranslateCmd = new ArbTranslateCmd({
      arbService: this.arbService,
      configService: this.configService,
      historyService: this.historyService,
      languageService: this.languageService,
      translationService: this.translationService,
      arbStatisticService: this.arbStatisticService,
    });
    this.arbCreateTranslationCacheCmd = new ArbCreateTranslationCacheCmd({
      arbService: this.arbService,
      configService: this.configService,
      translationCacheRepository: this.translationCacheRepository,
    });
    this.arbExcludeTranslationCmd = new ArbExcludeTranslationCmd({
      arbService: this.arbService,
      configService: this.configService,
      historyService: this.historyService,
    });
    this.arbConfigureTargetLanguageCodeCmd =
      new ArbConfigureTargetLanguageCodeCmd({
        arbService: this.arbService,
        configService: this.configService,
        languageService: this.languageService,
      });
    this.arbCheckCmd = new ArbCheckCmd({
      arbValidationService: this.arbValidationService,
      languageService: this.languageService,
      configService: this.configService,
      arbService: this.arbService,
    });
    this.arbDecodeAllHtmlEntitiesCmd = new ArbDecodeAllHtmlEntitiesCmd({
      arbValidationService: this.arbValidationService,
      languageService: this.languageService,
      configService: this.configService,
      arbService: this.arbService,
    });
    this.arbUploadToGoogleSheetCmd = new ArbUploadToGoogleSheetCmd({
      googleSheetService: this.googleSheetService,
      googleAuthService: this.googleAuthService,
      arbValidationService: this.arbValidationService,
      languageService: this.languageService,
      configService: this.configService,
      arbService: this.arbService,
    });
    this.arbOpenGoogleSheetCmd = new ArbOpenGoogleSheetCmd({
      googleSheetService: this.googleSheetService,
      configService: this.configService,
    });
    this.arbChangeKeysCmd = new ArbChangeKeysCmd({
      historyService: this.historyService,
      configService: this.configService,
      arbService: this.arbService,
    });
    this.arbDeleteKeysCmd = new ArbDeleteKeysCmd({
      historyService: this.historyService,
      configService: this.configService,
      arbService: this.arbService,
    });
    this.metadataCreateCmd = new MetadataCreateCmd({
      metadataService: this.metadataService,
    });
    this.metadataTranslateCmd = new MetadataTranslateCmd({
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
  }

  public init(): Promise<void[]> {
    return Promise.all([
      this.configRepository.init(),
      this.historyRepository.init(),
      this.cacheDataSource.init(),
    ]);
  }

  public disposed() {
    this.arbValidationRepository.disposed();
  }
}
