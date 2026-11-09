import type { ProviderCallOptions } from '../callOptions';
import type { Location } from '../../types/location';

/**
 * 反向地理編碼（把座標變成地名）的抽象介面。
 *
 * 為什麼需要它？
 *   瀏覽器的 Geolocation API 只會給座標，沒有地名。
 *   要在使用者自己的位置上顯示「臺北市」而不是「25.03, 121.56」，
 *   就必須做一次反向地理編碼。
 *
 * 為什麼不放在 Geocoder 裡？
 *   Geocoder（搜尋）有兩個實作都能做，ReverseGeocoder 只有 Nominatim 能做
 *   （Open-Meteo 沒有反向查詢）。拆成兩個 port，
 *   兩邊的「能不能做」不需要靠 optional method 來表達。
 */
export interface ReverseGeocoder {
  /** 供應商識別碼，用於 log 與除錯。 */
  readonly id: string;
  /** 由座標反查地點；查不到時回傳 null。 */
  reverse(
    latitude: number,
    longitude: number,
    options?: ProviderCallOptions,
  ): Promise<Location | null>;
}
