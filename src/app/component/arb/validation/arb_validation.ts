import { ARB } from "../arb";

export interface ARBValidationData {
  value: string;
  nParams: number;
  nLineBreaks: number;
  nParentheses: number;
  nHtmlEntities: number;
}

export interface ARBValidation {
  [key: string]: ARBValidationData;
}

export enum InvalidType {
  notExcluded = "Not excluded",
  keyNotFound = "Key does not exist",
  invalidLineBreaks = "Incorrect number of line breaks",
  invalidParameters = "Incorrect number of parameters",
  invalidParentheses = "Incorrect number of parentheses",
  undecodedHtmlEntityExists = "Undecoded html entity exists",
}

export interface ValidationResult {
  sourceValidationData: ARBValidationData;
  invalidType: InvalidType;
  invalidMessage?: string;
  sourceARB: ARB;
  targetARB: ARB;
  key: string;
}
