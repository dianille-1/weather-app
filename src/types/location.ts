/**
 * 地點（Location）領域模型。
 *
 * 這是「與資料來源無關」的型別：不管底層是 Open-Meteo、OpenWeatherMap 還是
 * 自建 API，上層元件只認得這個結構。要換供應商只要換掉 provider 的轉換層即可。
 */
export interface Location {
  /** 穩定且唯一的地點識別碼（用於快取 key 與 React key）。 */
  id: string;
  /** 地名，例如「臺北市」。 */
  name: string;
  /** 行政區，例如「臺灣省」。 */
  adminArea: string | null;
  /** 國家 / 地區名稱。 */
  country: string | null;
  /** 國家代碼，例如「TW」。 */
  countryCode: string | null;
  latitude: number;
  longitude: number;
  /** IANA 時區，例如「Asia/Taipei」。 */
  timezone: string | null;
}
