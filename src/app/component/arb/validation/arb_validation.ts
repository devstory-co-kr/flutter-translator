import { TextStatistic } from "../../../util/statistic";
import { ARB } from "../arb";

export interface ARBValidation {
  [key: string]: TextStatistic;
}

export enum InvalidType {
  notExcluded = "Not excluded",
  keyNotFound = "Key does not exist",
  invalidLineBreaks = "Incorrect number of line breaks",
  invalidParameters = "Incorrect number of parameters",
  invalidParameterName = "Incorrect parameter name",
  invalidParentheses = "Incorrect number of parentheses",
  undecodedHtmlEntityExists = "Undecoded html entity exists",
}

export interface ValidationResult {
  sourceValidationData: TextStatistic;
  invalidType: InvalidType;
  invalidMessage?: string;
  sourceARB: ARB;
  targetARB: ARB;
  key: string;
}
