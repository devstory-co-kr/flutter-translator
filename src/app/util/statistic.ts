export type OneHotScore = number;

export interface TextStatistic {
  text: string;
  nParams: number;
  nLineBreaks: number;
  nParentheses: number;
  nHtmlEntities: number;
  sum: number;
}

export default class Statistic {
  static getTotalParams(value: string): number {
    return (value.match(/\{.*?\}/g) || []).length;
  }

  static getTotalLineBreaks(value: string): number {
    return (value.match(/\n/g) || []).length;
  }

  static getTotalParentheses(value: string): number {
    return (value.match(/[(){}\[\]⌜⌟『』<>《》〔〕〘〙【】〖〗⦅⦆（）]/g) || [])
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
      sum: nParams + nLineBreaks + nParentheses + nHtmlEntities,
    };
  }

  public static getTranslationScore(
    answer: string,
    result: string
  ): OneHotScore {
    const nAnswer = this.getTextStatistic(answer).sum;
    const nResult = this.getTextStatistic(result).sum;
    return nAnswer === 0 ? 1 : this.convertToOneHotScore(nResult / nAnswer);
  }

  // The closer it is to 1, the better.
  // return -infinity ~ 1
  public static convertToOneHotScore(value: number): OneHotScore {
    return 1 - Math.abs(1 - value);
  }
}
