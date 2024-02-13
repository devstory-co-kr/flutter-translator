export interface History {
  data: Record<string, string>;
  keys: string[];
  values: string[];
}


export interface HistoryChange {
  key: string;
  sourceValue: string;
  historyValue?: string | undefined;
}
