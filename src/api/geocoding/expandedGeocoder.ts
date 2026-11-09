import type { ProviderCallOptions } from '../callOptions';
import type { Geocoder } from './geocoder';
import { buildQueryVariants } from './queryVariants';

/**
 * 查詢字串展開裝飾器。
 *
 * 當內層來源查不到結果時，改用字串變體再試一次
 * （例如「台中」→「台中市」、「台中」→「臺中」）。
 *
 * 取捨：
 *   - 只在「查無結果」時才展開。查到結果就不再試其他寫法，
 *     避免多打不必要的請求（每一次嘗試都是一次對上游的呼叫）。
 *   - 只展開到第一個有結果的變體為止，不會把所有變體的結果混在一起，
 *     因為不同變體的相關性排序並不可比。
 *   - 展開次數由呼叫端決定：Open-Meteo 沒有使用條款的負擔，可以多試；
 *     Nominatim 有頻率限制，就少試。
 */
export interface ExpandedGeocoderOptions {
  /** 最多嘗試幾個變體（含原字串）。 */
  maxVariants?: number;
}

export function createExpandedGeocoder(
  inner: Geocoder,
  options: ExpandedGeocoderOptions = {},
): Geocoder {
  const maxVariants = options.maxVariants ?? 4;

  return {
    id: `${inner.id}+expanded`,
    displayName: inner.displayName,

    async search(query: string, callOptions: ProviderCallOptions = {}) {
      const variants = buildQueryVariants(query, maxVariants);

      for (const variant of variants) {
        const results = await inner.search(variant, callOptions);
        if (results.length > 0) return results;
      }

      return [];
    },
  };
}
