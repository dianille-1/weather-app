import { createOpenMeteoProvider } from './openMeteoProvider';
import type { WeatherProvider } from './weatherProvider';
import { createCachedGeocoder, GEOCODING_CACHE_TTL_MS } from './geocoding/cachedGeocoder';
import { createExpandedGeocoder } from './geocoding/expandedGeocoder';
import { createFallbackGeocoder } from './geocoding/fallbackGeocoder';
import { createNominatimClient } from './geocoding/nominatimGeocoder';
import { createOpenMeteoGeocoder } from './geocoding/openMeteoGeocoder';
import type { Geocoder } from './geocoding/geocoder';
import type { ReverseGeocoder } from './geocoding/reverseGeocoder';

/**
 * Provider / Geocoder 工廠。
 *
 * 這是整個 App 唯一的「資料來源選擇點」：所有元件都只拿到介面，
 * 具體實作由這裡組裝。新增供應商時，只需要新增一個 adapter
 * 並在這裡註冊，元件完全不用動。
 */

/** 天氣資料來源（只負責預報）。 */
export function createWeatherProvider(id = 'open-meteo'): WeatherProvider {
  switch (id) {
    case 'open-meteo':
      return createOpenMeteoProvider();
    default:
      // 未知的 provider id 退回預設值，避免整個 App 起不來。
      console.warn(`[weather] 未知的資料來源 "${id}"，改用 open-meteo。`);
      return createOpenMeteoProvider();
  }
}

export interface GeocodingServices {
  /** 地名 → 座標（搜尋用）。 */
  geocoder: Geocoder;
  /** 座標 → 地名（瀏覽器定位用）。 */
  reverseGeocoder: ReverseGeocoder;
}

/**
 * 地名相關的服務。
 *
 * 組裝順序（由外而內）：快取 → 備援 → 查詢展開 → 各來源。
 *
 *   - 快取：同一組關鍵字在 5 分鐘內不會重複打任何上游服務。
 *   - 備援：Open-Meteo 先查（免 key、快）；查無結果才改用 Nominatim。
 *   - 查詢展開：查無結果時改用其他寫法再試（「台中」→「台中市」、「臺中」…），
 *     補足兩個來源的索引缺口。
 *
 * 兩邊的「展開次數」刻意不同：Open-Meteo 沒有使用條款的負擔，可以多試；
 * Nominatim 限制 1 request/second，因此少試一些。
 *
 * 反查共用同一個 Nominatim 實例，因此和搜尋共用同一個請求節流器 ——
 * Nominatim 的 1 request/second 限制是針對整個服務的，不是針對單一端點。
 */
export function createGeocodingServices(): GeocodingServices {
  const language = import.meta.env.VITE_GEOCODING_LANGUAGE ?? undefined;
  const fallbackEnabled = import.meta.env.VITE_GEOCODING_FALLBACK !== 'off';

  const nominatim = createNominatimClient({ language });

  const primary = createExpandedGeocoder(createOpenMeteoGeocoder({ language }), {
    maxVariants: 4,
  });
  const secondary = createExpandedGeocoder(nominatim, { maxVariants: 3 });
  const composed = fallbackEnabled
    ? createFallbackGeocoder(primary, secondary)
    : primary;

  return {
    geocoder: createCachedGeocoder(composed, GEOCODING_CACHE_TTL_MS),
    reverseGeocoder: nominatim,
  };
}

export { createOpenMeteoProvider, createOpenMeteoGeocoder, createNominatimClient };
export type { WeatherProvider } from './weatherProvider';
export type { ProviderCallOptions } from './callOptions';
export type { Geocoder } from './geocoding/geocoder';
export type { ReverseGeocoder } from './geocoding/reverseGeocoder';
