import type { Location } from '../types/location';

/**
 * 目前選取地點 ↔ 網址列的編碼。
 *
 * 分工：
 *   - 路徑（path）代表「是哪一個頁面」，由 router 負責；
 *   - 查詢參數（?lat=..&lon=..）代表「這個頁面的狀態」，由這裡負責。
 *
 * 這樣新增頁面時不必重新發明狀態的編碼方式，
 * 而「重新整理 / 分享連結」也會自然地回到同一個城市。
 *
 * 刻意不做的兩件事：
 *   1. 不做雙向綁定 —— 網址列被使用者手動改動時不會即時反映到 App。
 *      雙向綁定要處理競態與無效輸入，複雜度遠高於它的價值。
 *   2. 不把整個地點物件序列化 —— 只帶「顯示上需要而且從座標算不出來」的欄位，
 *      網址因此保持短小，同時分享出去的連結與本人看到的畫面一致。
 */
const LATITUDE_KEY = 'lat';
const LONGITUDE_KEY = 'lon';
const NAME_KEY = 'name';
const REGION_KEY = 'region';
const COUNTRY_KEY = 'country';
const COUNTRY_CODE_KEY = 'cc';

/** 從網址列的查詢參數還原出地點；沒有有效座標時回傳 null。 */
export function parseLocationFromSearch(params: URLSearchParams): Location | null {
  const latitude = Number.parseFloat(params.get(LATITUDE_KEY) ?? '');
  const longitude = Number.parseFloat(params.get(LONGITUDE_KEY) ?? '');

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: `url-${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name: params.get(NAME_KEY) ?? '目前位置',
    adminArea: params.get(REGION_KEY),
    country: params.get(COUNTRY_KEY),
    countryCode: params.get(COUNTRY_CODE_KEY),
    latitude,
    longitude,
    timezone: null,
  };
}

/** 把地點編碼成查詢參數（給 router 的 setSearchParams 使用）。 */
export function buildLocationSearch(location: Location): URLSearchParams {
  const params = new URLSearchParams();
  params.set(LATITUDE_KEY, location.latitude.toFixed(4));
  params.set(LONGITUDE_KEY, location.longitude.toFixed(4));
  if (location.name) params.set(NAME_KEY, location.name);
  if (location.adminArea) params.set(REGION_KEY, location.adminArea);
  if (location.country) params.set(COUNTRY_KEY, location.country);
  if (location.countryCode) params.set(COUNTRY_CODE_KEY, location.countryCode);
  return params;
}
