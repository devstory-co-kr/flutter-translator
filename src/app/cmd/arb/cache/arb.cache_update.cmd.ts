import * as vscode from "vscode";
import { ARB, ARBService } from "../../../component/arb/arb";
import { TranslationCacheKey } from "../../../component/translation/cache/translation_cache";
import { TranslationCacheRepository } from "../../../component/translation/cache/translation_cache.repository";
import { Toast } from "../../../util/toast";

interface InitParams {
  arbService: ARBService;
  translationCacheRepository: TranslationCacheRepository;
}

export type ARBCacheUpdateCmdArgs = {};

export class ARBCacheUpdateCmd {
  private arbService: ARBService;
  private translationCacheRepository: TranslationCacheRepository;

  constructor({ arbService, translationCacheRepository }: InitParams) {
    this.arbService = arbService;
    this.translationCacheRepository = translationCacheRepository;
  }

  public async run(args?: ARBCacheUpdateCmdArgs) {
    // load source arb
    const sourceArb: ARB = await this.arbService.getSourceARB();
    if (sourceArb.keys.length === 0) {
      Toast.i(`There is no data to cache : ${sourceArb.filePath}`);
      return;
    }

    // load all local target arb file paths
    const targetArbPathList = await this.arbService.getTargetARBPathList();

    // overwrite or create cache from local arb files
    const entries: { cacheKey: TranslationCacheKey; value: string }[] = [];
    let isCanceled = false;
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      async (progress, token) => {
        const total = targetArbPathList.length;
        let count = 0;
        for (const targetArbPath of targetArbPathList) {
          if (token.isCancellationRequested) {
            isCanceled = true;
            return;
          }
          count += 1;

          const targetArb: ARB = await this.arbService.getARB(targetArbPath);
          // skip source arb file
          if (
            targetArb.language.languageCode === sourceArb.language.languageCode
          ) {
            continue;
          }

          progress.report({
            message: `Updating cache... (${count} / ${total})`,
          });

          for (const sourceArbKey of sourceArb.keys) {
            // skip metadata keys (e.g. @key, @@locale)
            if (sourceArbKey.includes("@")) {
              continue;
            }
            // skip keys that do not exist in the target arb file
            if (!targetArb.keys.includes(sourceArbKey)) {
              continue;
            }

            const sourceArbValue = sourceArb.data[sourceArbKey];
            const targetArbValue = targetArb.data[sourceArbKey];
            if (!sourceArbValue || !targetArbValue) {
              continue;
            }

            entries.push({
              cacheKey: new TranslationCacheKey({
                sourceArbValue,
                sourceLanguage: sourceArb.language,
                targetLanguage: targetArb.language,
              }),
              value: targetArbValue,
            });
          }
        }
      }
    );

    if (isCanceled) {
      Toast.i("🟠 Canceled");
      return;
    }

    this.translationCacheRepository.upsertAll(entries);
    Toast.i(`🟢 ARB cache updated. (${entries.length} entries)`);
  }
}
