import type { Location } from './location';

/**
 * 天氣領域模型（與資料來源無關）。
 *
 * 溫度與風速一律以「使用者選擇的單位」表示，單位換算發生在 provider 邊界，
 * 因此 UI 層不需要到處檢查單位。
 */
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph';

export interface Units {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
}

/** 目前的即時天氣觀測值。 */
export interface CurrentWeather {
  /** 觀測時間（ISO 8601，地區當地時間）。 */
  observedAt: string;
  temperature: number;
  apparentTemperature: number;
  /** 相對濕度，百分比。 */
  humidity: number;
  /** 目前降水量（mm）。 */
  precipitation: number;
  windSpeed: number;
  /** 風向角度（0–360，0 為北）。 */
  windDirection: number;
  /** 是否為白天（用於決定太陽 / 月亮圖示）。 */
  isDay: boolean;
  /** WMO 天氣代碼，詳見 utils/weatherCodes.ts。 */
  weatherCode: number;
}

/** 單日預報。 */
export interface DailyForecast {
  /** 日期 YYYY-MM-DD（該地當地日期）。 */
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  /** 降雨機率，百分比。 */
  precipitationProbability: number;
  /** 累積降水量（mm）。 */
  precipitationSum: number;
  /** 日出時間（ISO 8601）。 */
  sunrise: string | null;
  /** 日落時間（ISO 8601）。 */
  sunset: string | null;
}

/** 一次完整的天氣查詢結果。 */
export interface WeatherSnapshot {
  location: Location;
  current: CurrentWeather;
  daily: DailyForecast[];
  /** 該地的 IANA 時區。 */
  timezone: string;
  units: Units;
}
