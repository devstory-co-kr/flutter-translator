import axios from "axios";
import {
  APIKeyRequiredException,
  TranslationFailureException,
} from "../../util/exceptions";
import { hasHtmlTags } from "../../util/html";
import {
  FreeTranslateDataSourceParams,
  PaidTranslateDataSourceParams,
  TranslationDataSource,
} from "../translation.datasource";

export class GoogleTranslationDataSource implements TranslationDataSource {
  /**
   * Free Google Translator (about 100 per hour)
   * Translation results may be worse than Paid API.
   * @param apiKey
   * @param text
   * @param sourceLang
   * @param targetLang
   * @returns
   * @throws TranslationFailureException
   */
  public async freeTranslate({
    text,
    sourceLang,
    targetLang,
  }: FreeTranslateDataSourceParams): Promise<string> {
    const response = await axios.get(
      encodeURI(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang.gt}&tl=${targetLang.gt}&dt=t&dt=bd&dj=1&source=icon&hl=${targetLang.gt}&q=${text}`
      )
    );
    if (response.status === 429) {
      throw new TranslationFailureException(
        "You have used up all of your free translation usage. (approximately 100 per hour)"
      );
    }
    if ("sentences" in response.data) {
      let result: string = "";
      for (const sentence of response.data.sentences) {
        result += sentence.trans;
      }
      return result;
    } else {
      return response.data.dict[0].terms[0];
    }
  }

  /**
   * Google Translator v2 (Google API Key required)
   * please refer to the [link](https://cloud.google.com/translate/docs/setup) and proceed with the API setting and API Key issuance process.
   * @param apiKey
   * @param text
   * @param sourceLang
   * @param targetLang
   * @returns
   */
  public async paidTranslate({
    apiKey,
    text,
    sourceLang,
    targetLang,
  }: PaidTranslateDataSourceParams): Promise<string> {
    if (!apiKey) {
      throw new APIKeyRequiredException();
    }

    const format = hasHtmlTags(text) ? "html" : "text";
    const response = await axios.get(
      encodeURI(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}&q=${text}&target=${targetLang.gt}&source=${sourceLang.gt}&alt=json&format=${format}`
      )
    );
    return response.data.data.translations[0].translatedText;
  }
}
