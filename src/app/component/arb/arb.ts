import { Language } from "../language/language";

export interface Arb {
  filePath: string;
  language: Language;
  data: Record<string, string>;
  keys: string[];
  values: string[];
}
