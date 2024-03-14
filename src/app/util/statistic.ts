export interface TextStatistic {
  text: string;
  nParams: number;
  nLineBreaks: number;
  nParentheses: number;
  nHtmlEntities: number;
  total: number;
}

export default class Statistic {
  static getTotalParams(value: string): number {
    return (value.match(/\{.*?\}/g) || []).length;
  }

  static getTotalLineBreaks(value: string): number {
    return (value.match(/\n/g) || []).length;
  }

  static getTotalParentheses(value: string): number {
    return (value.match(/[(){}\[\]⌜⌟『』<>《》〔〕〘〙【】〖〗⦅⦆]/g) || [])
      .length;
  }

  static getTotalHtmlEntites(value: string): number {
    return (value.match(/&[a-zA-Z]+;/g) || []).length;
  }

  public static getTextStatistic(text: string): TextStatistic {
    const nParams = this.getTotalParams(text);
    const nLineBreaks = this.getTotalLineBreaks(text);
    const nParentheses = this.getTotalParentheses(text);
    const nHtmlEntities = this.getTotalHtmlEntites(text);
    return {
      text: text,
      nParams,
      nLineBreaks,
      nParentheses,
      nHtmlEntities,
      total: nParams + nLineBreaks + nParentheses + nHtmlEntities,
    };
  }
}
