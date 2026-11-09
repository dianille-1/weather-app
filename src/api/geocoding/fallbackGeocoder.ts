import type { ProviderCallOptions } from '../callOptions';
import type { Geocoder } from './geocoder';

/**
 * 備援地理編碼裝飾器。
 *
 * 行為：先用主來源查詢；只有在「主來源回傳 0 筆結果」時才改用備援來源。
 *
 * 為什麼只在「查無結果」而不是「發生錯誤」時才切換？
 *   - 查無結果 → 這個地名主來源沒有收錄，換一個來源再試是合理的。
 *   - 發生錯誤 → 代表服務本身出問題（斷網、限流、伺服器故障），
 *     這是使用者該看到的錯誤訊息，而不是被另一個來源的結果掩蓋。
 *     而且此時打第二個服務只會讓故障時間加倍。
 *
 * 錯誤語意也刻意區分開來：主來源「正常回應但查無」→ 查詢失敗；
 * 主來源「掛掉」→ 服務異常。兩者對使用者來說是完全不同的情況。
 */
export interface FallbackGeocoderOptions {
  /** 關閉後只會呼叫主來源（可在環境變數中停用）。 */
  enabled?: boolean;
}

export function createFallbackGeocoder(
  primary: Geocoder,
  secondary: Geocoder,
  options: FallbackGeocoderOptions = {},
): Geocoder {
  const enabled = options.enabled ?? true;

  return {
    id: enabled ? `${primary.id}+${secondary.id}` : primary.id,
    displayName: enabled ? `${primary.displayName} / ${secondary.displayName}` : primary.displayName,

    async search(query: string, callOptions: ProviderCallOptions = {}) {
      const primaryResults = await primary.search(query, callOptions);

      if (!enabled || primaryResults.length > 0) {
        return primaryResults;
      }

      return secondary.search(query, callOptions);
    },
  };
}
