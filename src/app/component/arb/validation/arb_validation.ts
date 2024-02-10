import { ARB } from "../arb";

export interface ArbValidationData {
  value: string;
  nParams: number;
  nParentheses: number;
  nHtmlEntities: number;
}

export interface ArbValidation {
  [key: string]: ArbValidationData;
}

export enum InvalidType {
  keyNotFound = "Key does not exist",
  invalidParameters = "Incorrect number of parameters",
  invalidParentheses = "Incorrect number of parentheses",
  undecodedHtmlEntityExists = "Undecoded html entity exists",
}

export interface ValidationResult {
  sourceValidationData: ArbValidationData;
  invalidType: InvalidType;
  sourceArb: ARB;
  targetArb: ARB;
  key: string;
}
