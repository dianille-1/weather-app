import { createContext, useContext } from 'react';
import type { Geocoder } from '../api/geocoding/geocoder';
import type { ReverseGeocoder } from '../api/geocoding/reverseGeocoder';
import type { WeatherProvider } from '../api/weatherProvider';

/**
 * 資料來源服務的 context 定義。
 *
 * 為什麼要放在 context 裡，而不是各頁面自己 new 一份？
 *   - provider / geocoder 內部帶著快取，重複建立會讓快取失效；
 *   - 外框（頁尾）需要知道資料來源名稱才能正確標示，
 *     頁面需要拿到實際的實例 —— 兩邊必須是同一個。
 *
 * 這裡只放「服務實例」，不放任何業務狀態。
 */
export interface DataSources {
  weatherProvider: WeatherProvider;
  /** 地名搜尋（地名 → 座標）。 */
  geocoder: Geocoder;
  /** 反向地理編碼（座標 → 地名），用於瀏覽器定位。 */
  reverseGeocoder: ReverseGeocoder;
}

export const DataSourceContext = createContext<DataSources | null>(null);

export function useDataSources(): DataSources {
  const value = useContext(DataSourceContext);
  if (!value) {
    throw new Error('useDataSources 必須在 <DataSourceProvider> 內使用。');
  }
  return value;
}
