/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 天氣資料來源 id，目前支援 "open-meteo"。 */
  readonly VITE_WEATHER_PROVIDER?: string;
  /** 地名搜尋語言（ISO 639-1），例如 "zh"、"en"。 */
  readonly VITE_GEOCODING_LANGUAGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
