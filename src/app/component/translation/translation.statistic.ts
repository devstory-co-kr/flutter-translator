export interface TranslationStatisticData {
  nCreate: number;
  nUpdate: number;
  nSkip: number;
  nCache: number;
  nAPICall: number;
}

export interface TranslationStatisticOptionalData {
  nCreate?: number;
  nUpdate?: number;
  nSkip?: number;
  nCache?: number;
  nAPICall?: number;
}

export class TranslationStatistic {
  public data: TranslationStatisticData;

  constructor(param?: TranslationStatisticOptionalData) {
    this.data = {
      nCreate: param?.nCreate ?? 0,
      nUpdate: param?.nUpdate ?? 0,
      nSkip: param?.nSkip ?? 0,
      nCache: param?.nCache ?? 0,
      nAPICall: param?.nAPICall ?? 0,
    };
  }

  public get log(): string {
    return `api: ${this.data.nAPICall}, cache: ${this.data.nCache} | create: ${this.data.nCreate}, update: ${this.data.nUpdate}, skip: ${this.data.nSkip}`;
  }

  public sum(other: TranslationStatistic): TranslationStatistic {
    return new TranslationStatistic({
      nCreate: this.data.nCreate + other.data.nCreate,
      nUpdate: this.data.nUpdate + other.data.nUpdate,
      nSkip: this.data.nSkip + other.data.nSkip,
      nCache: this.data.nCache + other.data.nCache,
      nAPICall: this.data.nAPICall + other.data.nAPICall,
    });
  }
}
