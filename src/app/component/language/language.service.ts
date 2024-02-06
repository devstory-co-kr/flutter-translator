import path from "path";
import * as vscode from "vscode";
import {
  InvalidArbFileNameException,
  InvalidLanguageCodeException,
  SourceArbFilePathRequiredException,
} from "../../util/exceptions";
import { ArbFilePath, LanguageCode } from "../config/config";
import { ConfigService } from "../config/config.service";
import { CustomArbFileName, Language } from "./language";
import { LanguageRepository } from "./language.repository";

interface InitParams {
  configService: ConfigService;
}

export class LanguageService {
  private configService: ConfigService;
  constructor({ configService }: InitParams) {
    this.configService = configService;
  }

  private get customArbFileName(): CustomArbFileName {
    const customArbFileName = this.configService.config.customArbFileName ?? {};
    return {
      data: customArbFileName,
      languageCodeList: Object.keys(customArbFileName),
      arbFileNameList: Object.values(customArbFileName),
    };
  }

  public supportLanguages: Language[] = [
    LanguageRepository.afrikaans,
    LanguageRepository.albanian,
    LanguageRepository.amharic,
    LanguageRepository.arabic,
    LanguageRepository.armenian,
    LanguageRepository.assamese,
    LanguageRepository.aymara,
    LanguageRepository.azerbaijani,
    LanguageRepository.bambara,
    LanguageRepository.basque,
    LanguageRepository.belarusian,
    LanguageRepository.bengali,
    LanguageRepository.bhojpuri,
    LanguageRepository.bosnian,
    LanguageRepository.bulgarian,
    LanguageRepository.catalan,
    LanguageRepository.cebuano,
    LanguageRepository.chineseSimplified,
    LanguageRepository.chineseTraditional,
    LanguageRepository.corsican,
    LanguageRepository.croatian,
    LanguageRepository.czech,
    LanguageRepository.danish,
    LanguageRepository.dhivehi,
    LanguageRepository.dogri,
    LanguageRepository.dutch,
    LanguageRepository.english,
    LanguageRepository.esperanto,
    LanguageRepository.estonian,
    LanguageRepository.ewe,
    LanguageRepository.finnish,
    LanguageRepository.french,
    LanguageRepository.frisian,
    LanguageRepository.galician,
    LanguageRepository.georgian,
    LanguageRepository.german,
    LanguageRepository.greek,
    LanguageRepository.guarani,
    LanguageRepository.gujarati,
    LanguageRepository.haitianCreole,
    LanguageRepository.hausa,
    LanguageRepository.hawaiian,
    LanguageRepository.hebrew,
    LanguageRepository.hindi,
    LanguageRepository.hmong,
    LanguageRepository.hungarian,
    LanguageRepository.icelandic,
    LanguageRepository.igbo,
    LanguageRepository.ilocano,
    LanguageRepository.indonesian,
    LanguageRepository.irish,
    LanguageRepository.italian,
    LanguageRepository.japanese,
    LanguageRepository.javanese,
    LanguageRepository.kannada,
    LanguageRepository.kazakh,
    LanguageRepository.khmer,
    LanguageRepository.kinyarwanda,
    LanguageRepository.konkani,
    LanguageRepository.korean,
    LanguageRepository.krio,
    LanguageRepository.kurdish,
    LanguageRepository.kurdishSorani,
    LanguageRepository.kyrgyz,
    LanguageRepository.lao,
    LanguageRepository.latin,
    LanguageRepository.latvian,
    LanguageRepository.lingala,
    LanguageRepository.lithuanian,
    LanguageRepository.luganda,
    LanguageRepository.luxembourgish,
    LanguageRepository.macedonian,
    LanguageRepository.maithili,
    LanguageRepository.malagasy,
    LanguageRepository.malay,
    LanguageRepository.malayalam,
    LanguageRepository.maltese,
    LanguageRepository.maori,
    LanguageRepository.marathi,
    LanguageRepository.meiteilon,
    LanguageRepository.mizo,
    LanguageRepository.mongolian,
    LanguageRepository.myanmar,
    LanguageRepository.nepali,
    LanguageRepository.norwegian,
    LanguageRepository.nyanja,
    LanguageRepository.odia,
    LanguageRepository.oromo,
    LanguageRepository.pashto,
    LanguageRepository.persian,
    LanguageRepository.polish,
    LanguageRepository.portuguese,
    LanguageRepository.punjabi,
    LanguageRepository.quechua,
    LanguageRepository.romanian,
    LanguageRepository.russian,
    LanguageRepository.samoan,
    LanguageRepository.sanskrit,
    LanguageRepository.scotsGaelic,
    LanguageRepository.sepedi,
    LanguageRepository.serbian,
    LanguageRepository.sesotho,
    LanguageRepository.shona,
    LanguageRepository.sindhi,
    LanguageRepository.sinhala,
    LanguageRepository.slovak,
    LanguageRepository.slovenian,
    LanguageRepository.somali,
    LanguageRepository.spanish,
    LanguageRepository.sundanese,
    LanguageRepository.swahili,
    LanguageRepository.swedish,
    LanguageRepository.tagalog,
    LanguageRepository.tajik,
    LanguageRepository.tamil,
    LanguageRepository.tatar,
    LanguageRepository.telugu,
    LanguageRepository.thai,
    LanguageRepository.tigrinya,
    LanguageRepository.tsonga,
    LanguageRepository.turkish,
    LanguageRepository.turkmen,
    LanguageRepository.twi,
    LanguageRepository.ukrainian,
    LanguageRepository.urdu,
    LanguageRepository.uyghur,
    LanguageRepository.uzbek,
    LanguageRepository.vietnamese,
    LanguageRepository.welsh,
    LanguageRepository.xhosa,
    LanguageRepository.yiddish,
    LanguageRepository.yoruba,
    LanguageRepository.zulu,
  ];

  /**
   * check whether the language code is supported or not
   * @param languageCode
   * @throws InvalidLanguageCodeException
   */
  private checkIsSupportLanguageCode(languageCode: LanguageCode) {
    const language = this.supportLanguages.find(
      (language) => language.languageCode === languageCode
    );
    if (!language) {
      throw new InvalidLanguageCodeException(languageCode);
    }
  }

  /**
   * arbFilePath -> LanguageCode -> Language
   * @param arbFilePath
   * @returns Language
   * @throws InvalidLanguageCodeException, InvalidArbFileNameException
   */
  public getLanguageFromArbFilePath(arbFilePath: string): Language {
    const languageCode = this.getLanguageCodeFromArbFilePath(arbFilePath);
    return this.getLanguageByLanguageCode(languageCode);
  }

  /**
   * LanguageCode -> Language
   * @param languageCode
   * @returns Language
   * @throws InvalidLanguageCodeException
   */
  getLanguageByLanguageCode(languageCode: string): Language {
    const language = this.supportLanguages.find(
      (sl) => sl.languageCode === languageCode
    );
    if (!language) {
      throw new InvalidLanguageCodeException(languageCode);
    }
    return language;
  }

  /**
   * arbFilePath -> LanguageCode
   * @param arbFilePath
   * @returns LanguageCode
   * @throws InvalidArbFileNameException
   */
  public getLanguageCodeFromArbFilePath(arbFilePath: string): LanguageCode {
    const config = this.configService.config;
    const fileName = arbFilePath.split("/").pop()!.split(".arb")[0];
    let languageCode: string;

    // customArbFileName -> LanguageCode
    const customArbFileName = this.customArbFileName;
    const index = customArbFileName.arbFileNameList.indexOf(fileName);
    if (index !== -1) {
      languageCode = customArbFileName.languageCodeList[index];
      return languageCode;
    }

    // arbFilePath -> LanguageCode
    try {
      const fileName = arbFilePath.split("/").pop()!.split(".arb")[0];
      languageCode = config.arbFilePrefix
        ? fileName?.split(config.arbFilePrefix)[1]!
        : fileName;

      this.checkIsSupportLanguageCode(languageCode);
      return languageCode;
    } catch (e: any) {
      throw new InvalidArbFileNameException(arbFilePath);
    }
  }

  /**
   * LanguageCode -> arbFilePath
   * @param languageCode
   * @returns ArbFilePath
   * @throws SourceArbFilePathRequiredException, InvalidLanguageCodeException
   */
  public getArbFilePathFromLanguageCode(languageCode: string): ArbFilePath {
    const config = this.configService.config;
    const ext = ".arb";
    if (!config.sourceArbFilePath) {
      throw new SourceArbFilePathRequiredException();
    }
    const arbFolderPath: string = (config.sourceArbFilePath.match(/(.*\/)/) ?? [
      "",
    ])[0];
    // languageCode -> customArbFileName
    const customArbFileName = this.customArbFileName;
    const index = customArbFileName.languageCodeList.indexOf(languageCode);
    if (index !== -1) {
      const arbFileName = customArbFileName.arbFileNameList[index];
      const arbFilePath = path.join(
        arbFolderPath,
        arbFileName + (arbFileName.endsWith(ext) ? "" : ext)
      );
      return arbFilePath;
    }

    // languageCode -> defaultArbFileName
    const language = this.getLanguageByLanguageCode(languageCode);
    const prefix = config.arbFilePrefix ?? "";
    const arbFilePath = path.join(
      arbFolderPath,
      `${prefix + language.languageCode + ext}`
    );
    return arbFilePath;
  }

  /**
   * Select language code list except source arb language code
   * @param sourceArbLanguage
   * @returns selected language code list
   */
  public async selectLanguageCodeList(
    sourceArbLanguage: Language,
    picked: (languageCode: LanguageCode) => boolean
  ): Promise<LanguageCode[] | undefined> {
    const currentLanguageCodeList =
      this.configService.config.targetLanguageCodeList;
    const supportLanguageList: Language[] = this.supportLanguages.reduce<
      Language[]
    >((prev, curr) => {
      if (curr !== sourceArbLanguage) {
        prev.push(curr);
      }
      return prev;
    }, []);

    // pick items
    const pickItems: vscode.QuickPickItem[] = supportLanguageList.map(
      (language) => {
        return {
          label: language.name,
          description: language.languageCode,
          picked: picked(language.languageCode),
        };
      }
    );

    // select pick items
    const selectedItems = await vscode.window.showQuickPick(pickItems, {
      title: `Please select the language code of the language you wish to translate`,
      canPickMany: true,
    });

    return selectedItems?.map((item) => item.description!);
  }

  /**
   * Get file name from LanguageCode
   * @param languageCode
   */
  public getFileNameFromLanguageCode(languageCode: LanguageCode): string {
    const arbFilePath = this.getArbFilePathFromLanguageCode(languageCode);
    return path.basename(arbFilePath);
  }
}
