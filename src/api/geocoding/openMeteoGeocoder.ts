import type { ProviderCallOptions } from '../callOptions';
import type { Location } from '../../types/location';
import { getJson } from '../http';
import type { Geocoder } from './geocoder';

/**
 * Open-Meteo 地理編碼來源。
 *
 * 優點：免註冊、免 API key、回應快、一次回傳多筆且已依相關性排序。
 * 限制：它的地名索引是「名稱索引」而非模糊比對，且各語言的收錄完整度不一，
 *       中文索引對台灣等地並不齊全（實測「台北」「台中」查無結果，
 *       「台北市」「高雄」「香港」「東京」則正常）。
 *       因此這個 adapter 只作為搜尋的「第一順位」，查無結果時會交給備援來源。
 *
 * 官方文件：https://open-meteo.com/en/docs
 */

const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const DEFAULT_LANGUAGE = 'zh';
const RESULT_LIMIT = 10;

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

export interface OpenMeteoGeocoderOptions {
  /** 地名搜尋語言（ISO 639-1）。 */
  language?: string;
}

export function createOpenMeteoGeocoder(options: OpenMeteoGeocoderOptions = {}): Geocoder {
  const language = options.language ?? DEFAULT_LANGUAGE;

  return {
    id: 'open-meteo',
    displayName: 'Open-Meteo',

    async search(query: string, callOptions: ProviderCallOptions = {}): Promise<Location[]> {
      const url = new URL(GEOCODING_ENDPOINT);
      url.searchParams.set('name', query);
      url.searchParams.set('count', String(RESULT_LIMIT));
      url.searchParams.set('language', language);
      url.searchParams.set('format', 'json');

      const payload = await getJson<GeocodingResponse>(url.toString(), {
        signal: callOptions.signal,
      });

      return (payload.results ?? []).map(toLocation);
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
