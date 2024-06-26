export type OneHotScore = number;

export interface TextStatistic {
  text: string;
  nParams: number;
  nLineBreaks: number;
  nParentheses: number;
  nHtmlEntities: number;
  sum: number;
  paramNames: string[];
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
    const paramNames = text.match(/\{(.*?)\}/g) ?? [];
    return {
      text,
      nParams,
      nLineBreaks,
      nParentheses,
      nHtmlEntities,
      sum: nParams + nLineBreaks + nParentheses + nHtmlEntities,
      paramNames,
    };
  }

  public static getTranslationScore(
    answer: string,
    result: string
  ): OneHotScore {
    const answerStatistic = this.getTextStatistic(answer);
    const resultStatistic = this.getTextStatistic(result);
    const nAnswer = answerStatistic.sum;
    const nResult = resultStatistic.sum;
    return nAnswer === 0 ? 1 : this.convertToOneHotScore(nResult / nAnswer);
  }

  // The closer it is to 1, the better.
  // return -infinity ~ 1
  public static convertToOneHotScore(value: number): OneHotScore {
    return 1 - Math.abs(1 - value);
  }
}
