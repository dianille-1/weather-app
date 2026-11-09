import type { Location } from '../types/location';

/**
 * 把目前選取的地點同步到網址列（query string）。
 *
 * 取捨說明：這讓每個天氣頁面都可以直接分享／加入書籤，
 * 重新整理後仍停在同一個城市。代價是 App 與 URL 之間多了一層同步邏輯，
 * 因此這裡刻意只做「單向最小同步」：
 *   - URL → App：只在初始載入時讀取一次
 *   - App → URL：選取地點時用 replaceState 更新（不污染瀏覽紀錄）
 */
const LATITUDE_KEY = 'lat';
const LONGITUDE_KEY = 'lon';
const NAME_KEY = 'name';

export function parseLocationFromSearch(search: string): Location | null {
  const params = new URLSearchParams(search);
  const latitude = Number.parseFloat(params.get(LATITUDE_KEY) ?? '');
  const longitude = Number.parseFloat(params.get(LONGITUDE_KEY) ?? '');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: `url-${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name: params.get(NAME_KEY) ?? '目前位置',
    adminArea: null,
    country: null,
    countryCode: null,
    latitude,
    longitude,
    timezone: null,
  };
}

export function buildLocationSearch(location: Location): string {
  const params = new URLSearchParams();
  params.set(LATITUDE_KEY, location.latitude.toFixed(4));
  params.set(LONGITUDE_KEY, location.longitude.toFixed(4));
  if (location.name) params.set(NAME_KEY, location.name);
  return params.toString();
}

/** 把目前選取的地點寫回網址列（不新增瀏覽紀錄）。 */
export function syncLocationToUrl(location: Location): void {
  if (typeof window === 'undefined') return;
  const search = buildLocationSearch(location);
  window.history.replaceState(null, '', `${window.location.pathname}?${search}`);
}
