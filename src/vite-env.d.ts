/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 天氣資料來源 id，目前支援 "open-meteo"。 */
  readonly VITE_WEATHER_PROVIDER?: string;
  /** 地名搜尋語言（ISO 639-1），例如 "zh"、"en"。 */
  readonly VITE_GEOCODING_LANGUAGE?: string;
  /**
   * 備援地名來源（OpenStreetMap Nominatim）。
   * 設為 "off" 時關閉，只使用 Open-Meteo 的地名索引。
   */
  readonly VITE_GEOCODING_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
