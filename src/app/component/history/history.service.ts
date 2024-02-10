import { InvalidArgumentsException } from "../../util/exceptions";
import { ARB } from "../arb/arb";
import { History, HistoryChange } from "./history";
import { HistoryRepository } from "./history.repository";

interface initParam {
  historyRepository: HistoryRepository;
}

export class HistoryService {
  private historyRepository: HistoryRepository;

  constructor({ historyRepository }: initParam) {
    this.historyRepository = historyRepository;
  }

  /**
   * Returns items that values have changed compared to sourceArb and history
   * @param sourceArb
   * @returns
   */
  public compare(sourceArb: ARB): HistoryChange[] {
    const history: History = this.historyRepository.get();
    const historyDiffList: HistoryChange[] = [];
    for (const key of sourceArb.keys) {
      if (key.includes("@")) {
        continue;
      }
      const sourceValue: string = sourceArb.data[key];
      const historyValue: string | undefined = history.data[key];
      if (historyValue === sourceValue) {
        // not udated
        continue;
      }

      // created & updated
      historyDiffList.push({
        key,
        sourceValue,
        historyValue: historyValue ?? sourceValue,
      });
    }
    return historyDiffList;
  }

  public update(data: Record<string, string>) {
    this.historyRepository.set(data);
  }

  public get(): History {
    return this.historyRepository.get();
  }

  public updateKeys(oldKeys: string[], newKeys: string[]) {
    if (oldKeys.length !== newKeys.length) {
      throw new InvalidArgumentsException(
        `The number of old keys(${oldKeys.length}) and the number of new keys(${newKeys.length}) are different.`
      );
    }
    const history = this.get();
    let nChanged = 0;
    for (let i = 0; i < oldKeys.length; i++) {
      const oldKey = oldKeys[i];
      const newKey = newKeys[i];
      const oldKeyIndex = history.keys.indexOf(oldKey);
      if (oldKeyIndex !== -1) {
        history.keys[oldKeyIndex] = newKey;
        nChanged += 1;
      }
    }

    if (nChanged) {
      const historyData = history.keys.reduce<Record<string, string>>(
        (prev, key, index) => {
          prev[key] = history.values[index];
          return prev;
        },
        {}
      );
      this.update(historyData);
    }
  }

  public deleteKeys(deleteKeys: string[]) {
    const history = this.get();
    const newData = { ...history.data };
    let nDeleted = 0;
    for (const deleteKey of deleteKeys) {
      if (history.keys.includes(deleteKey)) {
        delete newData[deleteKey];
        nDeleted += 1;
      }
    }
    if (nDeleted > 0) {
      this.update(newData);
    }
  }
}
