import type { TemperatureUnit, WindSpeedUnit } from '../types/weather';

/**
 * 單位換算與格式化。
 *
 * 資料來源固定回傳攝氏 / km-h，換算統一在這裡做，
 * 讓 domain model 永遠是「使用者看到的單位」，UI 層不需要做換算。
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function convertTemperature(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? celsiusToFahrenheit(value) : value;
}

export function convertWindSpeed(value: number, unit: WindSpeedUnit): number {
  return unit === 'mph' ? kmhToMph(value) : value;
}

export function temperatureSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function windSpeedSymbol(unit: WindSpeedUnit): string {
  return unit === 'mph' ? 'mph' : 'km/h';
}

/** 格式化溫度，例如「24°C」。 */
export function formatTemperature(value: number, unit: TemperatureUnit): string {
  return `${Math.round(value)}${temperatureSymbol(unit)}`;
}

/** 格式化風速，例如「12 km/h」。 */
export function formatWindSpeed(value: number, unit: WindSpeedUnit): string {
  return `${Math.round(value)} ${windSpeedSymbol(unit)}`;
}

/** 格式化百分比，例如「70%」。 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}
