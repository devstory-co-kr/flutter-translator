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
      console.log(`Batch : ${i}/${promises.length}`);
      results.push(...batchResults);
    }

    return results;
  }
}
