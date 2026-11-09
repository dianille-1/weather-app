import { AppError } from './errors';
import { getJson } from './http';
import type { Location } from '../types/location';
import type { DailyForecast, Units, WeatherSnapshot } from '../types/weather';
import { convertTemperature, convertWindSpeed } from '../utils/units';
import type { ProviderCallOptions, WeatherProvider } from './weatherProvider';

/**
 * Open-Meteo provider。
 *
 * 為什麼選 Open-Meteo：
 *   - 免註冊、免 API key，對 take-home 作業與面試演示最友善
 *   - 回傳原始資料（沒有難以解析的在地化字串），資料格式穩定
 *   - 有明確的 WMO 天氣代碼，語意跨國一致
 *
 * 官方文件：https://open-meteo.com/en/docs
 */

const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_LANGUAGE = 'zh';
const FORECAST_DAYS = 7;

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'is_day',
] as const;

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'sunrise',
  'sunset',
] as const;

/** 地理編碼 API 的原始回應格式（僅取用到的欄位）。 */
interface GeocodingResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }>;
}

/** 預報 API 的原始回應格式（僅取用到的欄位）。 */
interface ForecastResponse {
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
    sunrise?: string[];
    sunset?: string[];
  };
}

export interface OpenMeteoProviderOptions {
  /** 地名搜尋語言（ISO 639-1）。 */
  language?: string;
}

export function createOpenMeteoProvider(options: OpenMeteoProviderOptions = {}): WeatherProvider {
  const language = options.language ?? DEFAULT_LANGUAGE;

  return {
    id: 'open-meteo',
    displayName: 'Open-Meteo',

    async searchLocations(query: string, callOptions: ProviderCallOptions = {}): Promise<Location[]> {
      const url = new URL(GEOCODING_ENDPOINT);
      url.searchParams.set('name', query);
      url.searchParams.set('count', '10');
      url.searchParams.set('language', language);
      url.searchParams.set('format', 'json');

      const payload = await getJson<GeocodingResponse>(url.toString(), {
        signal: callOptions.signal,
      });

      return (payload.results ?? []).map(toLocation);
    },

    async fetchWeather(
      location: Location,
      units: Units,
      callOptions: ProviderCallOptions = {},
    ): Promise<WeatherSnapshot> {
      const url = new URL(FORECAST_ENDPOINT);
      url.searchParams.set('latitude', String(location.latitude));
      url.searchParams.set('longitude', String(location.longitude));
      url.searchParams.set('current', CURRENT_FIELDS.join(','));
      url.searchParams.set('daily', DAILY_FIELDS.join(','));
      url.searchParams.set('timezone', 'auto');
      url.searchParams.set('forecast_days', String(FORECAST_DAYS));
      // 固定用攝氏 / km-h 回應，換算在 provider 邊界完成，確保資料格式一致。
      url.searchParams.set('temperature_unit', 'celsius');
      url.searchParams.set('wind_speed_unit', 'kmh');

      const payload = await getJson<ForecastResponse>(url.toString(), {
        signal: callOptions.signal,
      });

      return toSnapshot(payload, location, units);
    },
  };
}

/** 原始回應 → 領域模型。 */
function toLocation(raw: NonNullable<GeocodingResponse['results']>[number]): Location {
  return {
    id: `geo-${raw.id}`,
    name: raw.name,
    adminArea: cleanAdminArea(raw.admin1),
    country: raw.country ?? null,
    countryCode: raw.country_code ? raw.country_code.toUpperCase() : null,
    latitude: raw.latitude,
    longitude: raw.longitude,
    timezone: raw.timezone ?? null,
  };
}

/**
 * Open-Meteo 在部分地區會回傳「臺灣省 or 台灣省」這種多語系並列的欄位，
 * 這裡取主要名稱，避免 UI 出現奇怪的重複字串。
 */
function cleanAdminArea(value: string | undefined): string | null {
  if (!value) return null;
  const [primary = ''] = value.split(' or ');
  const cleaned = primary.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toSnapshot(
  payload: ForecastResponse,
  location: Location,
  units: Units,
): WeatherSnapshot {
  const current = payload.current;
  if (!current) {
    throw new AppError('parse', '天氣服務未回傳即時天氣資料，請稍後再試。');
  }

  return {
    location,
    timezone: payload.timezone ?? location.timezone ?? 'UTC',
    units,
    current: {
      observedAt: current.time,
      temperature: convertTemperature(current.temperature_2m, units.temperature),
      apparentTemperature: convertTemperature(
        current.apparent_temperature,
        units.temperature,
      ),
      humidity: current.relative_humidity_2m,
      precipitation: current.precipitation,
      windSpeed: convertWindSpeed(current.wind_speed_10m, units.windSpeed),
      windDirection: current.wind_direction_10m,
      isDay: current.is_day === 1,
      weatherCode: current.weather_code,
    },
    daily: toDailyForecast(payload.daily, units),
  };
}

function toDailyForecast(
  daily: ForecastResponse['daily'],
  units: Units,
): DailyForecast[] {
  if (!daily) return [];

  return daily.time.map((date, index) => ({
    date,
    weatherCode: daily.weather_code[index] ?? 0,
    temperatureMax: convertTemperature(daily.temperature_2m_max[index] ?? 0, units.temperature),
    temperatureMin: convertTemperature(daily.temperature_2m_min[index] ?? 0, units.temperature),
    precipitationProbability: daily.precipitation_probability_max?.[index] ?? 0,
    precipitationSum: daily.precipitation_sum?.[index] ?? 0,
    sunrise: daily.sunrise?.[index] ?? null,
    sunset: daily.sunset?.[index] ?? null,
  }));
}
