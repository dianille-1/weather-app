import type { ProviderCallOptions } from '../callOptions';
import type { Location } from '../../types/location';
import { AppError } from '../errors';
import { getJson } from '../http';
import type { Geocoder } from './geocoder';
import type { ReverseGeocoder } from './reverseGeocoder';

/**
 * OSM Nominatim 地理編碼來源（OpenStreetMap 官方服務，免註冊、免 API key）。
 *
 * 為什麼需要它：
 *   Open-Meteo 的地名索引是「名稱索引」，中文覆蓋不完整——
 *   實測以 language=zh 查詢時，「台北」「台中」「桃園」「臺中」都查不到結果，
 *   但「台北市」「高雄」「香港」「東京」「北京」可以。
 *   對一個中文介面的天氣 App 來說，使用者最直覺的輸入（打「台北」）
 *   剛好落在这个缺口裡，因此需要一個中文覆蓋較完整的備援來源。
 *
 * 使用條款（取用前務必確認）：
 *   - 官方政策：https://operations.osmfoundation.org/policies/nominatim/
 *   - 最多 1 request/second、不得大量或自動連續查詢。
 *     本 App 只在使用者主動搜尋、且第一順位來源查無結果時才呼叫，
 *     並加上 TTL 快取（同一次查詢不會重複打出去），符合低頻使用的限制。
 *   - 政策要求提供可識別的 User-Agent 或 Referer；瀏覽器會自動帶 Referer，
 *     但正式產品仍建議由後端代理並設定固定 User-Agent（見 README「已知限制」）。
 *
 * 回應格式：https://nominatim.org/release-docs/develop/api/Search
 *        https://nominatim.org/release-docs/develop/api/Reverse
 */

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_LANGUAGE = 'zh';
const RESULT_LIMIT = 10;

/**
 * 標示用戶端的 User-Agent。
 *
 * Nominatim 會以 403 拒絕 User-Agent 為 "node" 的請求（Node 內建的 fetch
 * 預設就是這個值），因此在 Node 環境（測試 / 未來若做 SSR）必須自行指定。
 *
 * 注意：User-Agent 是 Fetch spec 的 forbidden header name，瀏覽器會直接忽略
 * 這個設定並改帶自己的瀏覽器 UA 與 Referer —— 也就是說這行對瀏覽器行為沒有
 * 影響，只是讓 Node 環境也能正常使用。瀏覽器本身帶的 UA／Referer 即可滿足
 * Nominatim「必須可識別用戶端」的使用條款。
 */
const CLIENT_USER_AGENT =
  'weather-app-takehome/1.0 (frontend take-home; https://github.com/dianille-1/weather-app)';

/**
 * 只保留「聚落 / 行政區」層級的結果。
 *
 * Nominatim 同時會回傳街道、門牌、建物等地址層級的結果，
 * 對天氣 App 沒有意義（我們要的是城市的氣候，不是某棟樓的），
 * 而且地址層級的名稱常常不是使用者想找的地點。
 */
const PLACE_LEVEL_TYPES = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'borough',
  'county',
  'state',
  'province',
  'region',
  'country',
]);

/**
 * 反查時用來取出「聚落名稱」的欄位順序。
 *
 * 由細到粗：city → town → village → municipality → county → state → province。
 * 反查的結果是「最近的物件」（例如某棟辦公大樓），
 * 城市名要從 address 裡的行政層級欄位才有。
 */
const PLACE_NAME_KEYS = [
  'city',
  'town',
  'village',
  'municipality',
  'county',
  'state',
  'province',
] as const;

/** Nominatim 單筆結果（僅取用到的欄位）。 */
interface NominatimResult {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    province?: string;
    region?: string;
    country?: string;
    country_code?: string;
  };
}

export interface NominatimGeocoderOptions {
  /** 回應語言（Accept-Language），決定地名的顯示形式。 */
  language?: string;
}

/**
 * Nominatim 客戶端：同時提供「地名 → 座標」與「座標 → 地名」。
 *
 * 合成在同一個實例，是為了讓兩種請求共用同一個節流器 ——
 * Nominatim 的 1 request/second 限制是針對整個服務的，不是針對單一端點。
 */
export interface NominatimClient extends Geocoder, ReverseGeocoder {}

export function createNominatimClient(options: NominatimGeocoderOptions = {}): NominatimClient {
  const language = options.language ?? DEFAULT_LANGUAGE;

  // Nominatim 的使用條款要求「最多 1 request/second」。
  // 用一個閉包變數記錄上次請求時間，保證兩次請求至少間隔 MIN_REQUEST_INTERVAL_MS。
  let lastRequestAt = 0;

  const waitForSlot = async (signal: AbortSignal | undefined): Promise<void> => {
    const waitMs = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    if (signal?.aborted) {
      throw new AppError('aborted', '請求已取消。');
    }
    lastRequestAt = Date.now();
  };

  return {
    id: 'nominatim',
    displayName: 'OpenStreetMap Nominatim',

    async search(query: string, callOptions: ProviderCallOptions = {}): Promise<Location[]> {
      await waitForSlot(callOptions.signal);

      const url = new URL(NOMINATIM_ENDPOINT);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', String(RESULT_LIMIT));
      url.searchParams.set('accept-language', language);

      const payload = await getJson<NominatimResult[]>(url.toString(), {
        signal: callOptions.signal,
        headers: { 'User-Agent': CLIENT_USER_AGENT },
      });

      if (!Array.isArray(payload)) return [];

      return payload
        .filter((item) => isPlaceLevel(item))
        .map(toLocation)
        .filter((location): location is Location => location !== null);
    },

    async reverse(
      latitude: number,
      longitude: number,
      callOptions: ProviderCallOptions = {},
    ): Promise<Location | null> {
      await waitForSlot(callOptions.signal);

      const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('accept-language', language);
      // zoom=10 ≈ 城市層級；預設的 18 會精確到門牌，reverse 的結果會是
      // 「最近的地址物件」（例如某棟大樓），而不是城市。
      url.searchParams.set('zoom', '10');

      const payload = await getJson<NominatimResult>(url.toString(), {
        signal: callOptions.signal,
        headers: { 'User-Agent': CLIENT_USER_AGENT },
      });

      return toReverseLocation(payload, latitude, longitude);
    },
  };
}

/** 兩次請求之間至少間隔的時間（Nominatim 政策：1 request/second）。 */
const MIN_REQUEST_INTERVAL_MS = 1000;

function isPlaceLevel(result: NominatimResult): boolean {
  const type = result.addresstype;
  return typeof type === 'string' && PLACE_LEVEL_TYPES.has(type);
}

/** 原始回應 → 領域模型。 */
function toLocation(raw: NominatimResult): Location | null {
  const latitude = Number.parseFloat(raw.lat ?? '');
  const longitude = Number.parseFloat(raw.lon ?? '');
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  // display_name 的格式是「地點, 行政區, 國家」，用來補齊缺少的欄位。
  const parts = (raw.display_name ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const name = raw.name?.trim() || parts[0] || '';
  if (name.length === 0) return null;

  const country = cleanMultilingual(raw.address?.country) ?? parts.at(-1) ?? null;
  const adminArea = pickAdminArea(raw.address, parts, name, country);

  const osmKey = raw.osm_type && raw.osm_id !== undefined ? `${raw.osm_type}-${raw.osm_id}` : null;

  return {
    id: osmKey ? `osm-${osmKey}` : `osm-place-${raw.place_id ?? name}`,
    name,
    adminArea,
    country,
    countryCode: raw.address?.country_code ? raw.address.country_code.toUpperCase() : null,
    latitude,
    longitude,
    // Nominatim 不提供時區；天氣 API 會自行回傳當地時區，不影響顯示。
    timezone: null,
  };
}

/**
 * 反查結果 → 領域模型。
 *
 * 注意用的是「輸入的座標」而不是反查物件的座標：
 * 我們要的是使用者所在位置的氣候，不是最近那棟大樓的氣候。
 */
function toReverseLocation(
  raw: NominatimResult,
  latitude: number,
  longitude: number,
): Location | null {
  const address = raw.address;
  if (!address) return null;

  const name = pickPlaceName(address);
  if (!name) return null;

  const country = cleanMultilingual(address.country);
  const adminArea = cleanMultilingual(address.state ?? address.province ?? address.region);

  return {
    id: `rev-${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name,
    adminArea: adminArea && adminArea !== name ? adminArea : null,
    country,
    countryCode: address.country_code ? address.country_code.toUpperCase() : null,
    latitude,
    longitude,
    timezone: null,
  };
}

/** 由行政層級欄位取出聚落名稱。 */
function pickPlaceName(address: NonNullable<NominatimResult['address']>): string | null {
  for (const key of PLACE_NAME_KEYS) {
    const value = cleanMultilingual(address[key]);
    if (value) return value;
  }
  return null;
}

/**
 * 行政區名稱。
 *
 * 優先用 address 裡明確的欄位（state / province / region）；
 * 沒有時退回 display_name 中「既不是地名也不是國家」的那一段
 * （例如 "Springfield, Illinois, United States" → "Illinois"）。
 */
function pickAdminArea(
  address: NominatimResult['address'],
  parts: string[],
  name: string,
  country: string | null,
): string | null {
  const direct = cleanMultilingual(address?.state ?? address?.province ?? address?.region);
  if (direct && direct !== name) return direct;

  const candidate = parts.find((part) => part !== name && part !== country);
  return candidate ?? null;
}

/**
 * Nominatim 在某些地區會回傳多語系並列的名稱（例如「美国;美國」、
 * 「New York or New York」），取第一個主要名稱即可。
 */
function cleanMultilingual(value: string | undefined | null): string | null {
  if (!value) return null;
  const [primary = ''] = value.split(/;|\s+or\s+/);
  const cleaned = primary.trim();
  return cleaned.length > 0 ? cleaned : null;
}
