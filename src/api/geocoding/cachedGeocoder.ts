import type { ProviderCallOptions } from '../callOptions';
import type { Location } from '../../types/location';
import { createTtlCache } from '../cache';
import type { Geocoder } from './geocoder';

/**
 * TTL 快取裝飾器。
 *
 * 用途：
 *   1. 使用者切回剛才看過的關鍵字時不必重新打 API（體感更快）。
 *   2. 減少對備援來源的呼叫次數 —— Nominatim 的使用條款要求低頻使用，
 *      這一層確保「同一組字串在有效期限內只會送出一次請求」。
 *
 * 刻意不做成通用的快取框架：需求很小，一個 Map 就夠。
 * 需要跨分頁保留時再換成 localStorage / IndexedDB 即可。
 */
export const GEOCODING_CACHE_TTL_MS = 5 * 60 * 1000;

export function createCachedGeocoder(
  inner: Geocoder,
  ttlMs: number = GEOCODING_CACHE_TTL_MS,
): Geocoder {
  const cache = createTtlCache<Location[]>(ttlMs);

  return {
    id: `${inner.id}+cache`,
    displayName: inner.displayName,

    async search(query: string, callOptions: ProviderCallOptions = {}) {
      const key = normalizeKey(query);
      const cached = cache.get(key);
      if (cached) return cached;

      const results = await inner.search(query, callOptions);
      // 空結果也快取：避免使用者反覆查一個不存在的地名時一直打 API。
      cache.set(key, results);
      return results;
    },
  };
}

/** 快取 key：去空白 + 忽略大小寫，讓 "Taipei" 與 " taipei " 視為同一組查詢。 */
function normalizeKey(query: string): string {
  return query.trim().toLowerCase();
}
