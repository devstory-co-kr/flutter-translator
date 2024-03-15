export default class Batch {
  public static async start<T>({
    promises,
    batchSize,
    progress,
  }: {
    promises: (() => Promise<T>)[];
    batchSize: number;
    progress?: (current: number, total: number) => void;
  }): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < promises.length; i += batchSize) {
      if (progress) {
        progress(i, promises.length);
      }
      const batchFn = promises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batchFn.map((fn) => fn()));
      results.push(...batchResults);
    }

    return results;
  }

  public static chunkArray<T>(array: T[], size: number): T[][] {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  }
}
