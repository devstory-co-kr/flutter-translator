import { ArbService } from "./arb/arb.service";
import { ArbStatisticService } from "./arb_statistic/arb_statistic.service";
import { ArbValidationRepository } from "./arb_validation/arb_validation.repository";
import { ArbValidationService } from "./arb_validation/arb_validation.service";
import { TranslationCacheDataSource } from "./cache/translation_cache.datasource";
import { TranslationCacheRepository } from "./cache/translation_cache.repository";
import { ArbConfigureTargetLanguageCodeCmd } from "./command/arb/configure/configure_target_language_code.cmd";
import { ArbExcludeTranslationCmd } from "./command/arb/configure/exclude_translation.cmd";
import { ArbInitializeCmd } from "./command/arb/configure/initialize.cmd";
import { ArbOpenGoogleSheetCmd } from "./command/arb/google_sheet/open_google_sheet.cmd";
import { ArbUploadToGoogleSheetCmd } from "./command/arb/google_sheet/upload_to_google_sheet.cmd";
import { ArbChangeKeysCmd } from "./command/arb/keys/change_keys.cmd";
import { ArbDeleteKeysCmd } from "./command/arb/keys/delete_keys.cmd";
import { ArbCreateTranslationCacheCmd } from "./command/arb/translate/create_translation_cache.cmd";
import { ArbTranslateCmd } from "./command/arb/translate/translate.cmd";
import { ArbDecodeAllHtmlEntitiesCmd } from "./command/arb/validate/decode_all_html_entities.cmd";
import { ArbValidateTranslationCmd } from "./command/arb/validate/validate_translation.cmd";
import { ConfigRepository } from "./config/config.repository";
import { ConfigService } from "./config/config.service";
import { GoogleAuthService } from "./google_sheet/google_auth.service";
import { GoogleSheetRepository } from "./google_sheet/google_sheet.repository";
import { GoogleSheetService } from "./google_sheet/google_sheet.service";
import { HistoryRepository } from "./history/history.repository";
import { HistoryService } from "./history/history.service";
import { LanguageService } from "./language/language.service";
import { GoogleTranslationDataSource } from "./translation/google/google_translation.datasource";
import { GoogleTranslationRepository } from "./translation/google/google_translation.repository";
import { GoogleTranslationService } from "./translation/google/google_translation.service";

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

  /**
   * Command
   */
  public arbInitializeCmd: ArbInitializeCmd;
  public arbTranslateCmd: ArbTranslateCmd;
  public arbCreateTranslationCacheCmd: ArbCreateTranslationCacheCmd;
  public arbExcludeTranslationCmd: ArbExcludeTranslationCmd;
  public arbSelectTargetLanguageCodeCmd: ArbConfigureTargetLanguageCodeCmd;
  public arbValidateTranslationCmd: ArbValidateTranslationCmd;
  public arbDecodeAllHtmlEntitiesCmd: ArbDecodeAllHtmlEntitiesCmd;
  public arbUploadToGoogleSheetCmd: ArbUploadToGoogleSheetCmd;
  public arbOpenGoogleSheetCmd: ArbOpenGoogleSheetCmd;
  public arbChangeKeysCmd: ArbChangeKeysCmd;
  public arbDeleteKeysCmd: ArbDeleteKeysCmd;

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
    this.arbSelectTargetLanguageCodeCmd = new ArbConfigureTargetLanguageCodeCmd(
      {
        arbService: this.arbService,
        configService: this.configService,
        languageService: this.languageService,
      }
    );
    this.arbValidateTranslationCmd = new ArbValidateTranslationCmd({
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
