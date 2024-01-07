import { ArbService } from "./arb/arb.service";
import { TranslationCacheRepository } from "./cache/translation_cache.repository";
import { CreateTranslationCache } from "./command/create_translation_cache.cmd";
import { OverrideSourceArbHistory } from "./command/override_source_arb_history.cmd";
import { TranslateCmd } from "./command/translate.cmd";
import { ConfigRepository } from "./config/config.repository";
import { ConfigService } from "./config/config.service";
import { HistoryRepository } from "./history/history.repository";
import { HistoryService } from "./history/history.service";
import { LanguageService } from "./language/language.service";
import { GoogleTranslationFreeDataSource } from "./translation/google/google_translation.free.datasource";
import { GoogleTranslationPaidDataSource } from "./translation/google/google_translation.paid.datasource";
import { GoogleTranslationRepository } from "./translation/google/google_translation.repository";
import { GoogleTranslationService } from "./translation/google/google_translation.service";

export class DependencyInjector {
  /**
   * DataSource
   */
  private paidTranslationDataSource: GoogleTranslationPaidDataSource;
  private freeTranslationDataSource: GoogleTranslationFreeDataSource;

  /**
   * Repository
   */
  private cacheRepository: TranslationCacheRepository;
  private translationRepository: GoogleTranslationRepository;
  private historyRepository: HistoryRepository;
  private configRepository: ConfigRepository;

  /**
   * Service
   */
  private historyService: HistoryService;
  private configService: ConfigService;
  private languageService: LanguageService;
  private arbService: ArbService;
  private translationService: GoogleTranslationService;

  /**
   * Command
   */
  public translationCmd: TranslateCmd;
  public createTranslationCache: CreateTranslationCache;
  public overrideSourceArbHistory: OverrideSourceArbHistory;

  constructor() {
    // data source
    this.paidTranslationDataSource = new GoogleTranslationPaidDataSource();
    this.freeTranslationDataSource = new GoogleTranslationFreeDataSource();

    // repository
    this.cacheRepository = new TranslationCacheRepository();
    this.translationRepository = new GoogleTranslationRepository({
      cacheRepository: this.cacheRepository,
      paidTranslationDataSource: this.paidTranslationDataSource,
      freeTranslationDataSource: this.freeTranslationDataSource,
    });
    this.historyRepository = new HistoryRepository();
    this.configRepository = new ConfigRepository();

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
      translationRepository: this.translationRepository,
    });

    // cmd
    this.translationCmd = new TranslateCmd({
      arbService: this.arbService,
      configService: this.configService,
      historyService: this.historyService,
      languageService: this.languageService,
      translationService: this.translationService,
    });
    this.createTranslationCache = new CreateTranslationCache({
      arbService: this.arbService,
      configService: this.configService,
      cacheRepository: this.cacheRepository,
    });
    this.overrideSourceArbHistory = new OverrideSourceArbHistory({
      arbService: this.arbService,
      configService: this.configService,
      historyService: this.historyService,
    });
  }
}
