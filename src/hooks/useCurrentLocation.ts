import { useEffect, useMemo, useState } from 'react';
import { AppError } from '../api/errors';
import type { ReverseGeocoder } from '../api/geocoding/reverseGeocoder';
import type { Location } from '../types/location';

/**
 * 取得使用者目前的位置。
 *
 * 這是「沒有搜尋任何城市時」的預設體驗：直接顯示當地天氣。
 *
 * 流程：
 *   1. 請瀏覽器取得座標（Geolocation API）
 *   2. 用反向地理編碼把座標換成地名（例如「臺北市」）
 *   3. 反查失敗時不影響主要功能 —— 仍然用座標顯示天氣，只是地名顯示「目前位置」
 *
 * 幾個實作上的考量：
 *   - `maximumAge`：5 分鐘內的定位結果直接沿用瀏覽器的快取，
 *     避免使用者每次進頁面都被重新詢問。
 *   - 定位失敗不是致命錯誤：權限被拒絕或瀏覽器不支援時，
 *     退回「請搜尋城市」的畫面即可。
 *   - 狀態是「推導」出來的，不是用 effect 同步寫入的：
 *     這樣 effect 裡就不需要 setState，也就不會造成多一次渲染。
 */
export type CurrentLocationStatus = 'idle' | 'locating' | 'ready' | 'error';

export interface CurrentLocation {
  /** 已解析的地點；反查失敗時會是一個只有座標的最小地點。 */
  location: Location | null;
  status: CurrentLocationStatus;
  error: AppError | null;
}

/** 非同步請求的結果。 */
type GeolocationResult =
  | { kind: 'idle' }
  | { kind: 'ready'; location: Location | null }
  | { kind: 'error'; error: AppError };

/** 定位逾時時間（毫秒）。 */
const GEOLOCATION_TIMEOUT_MS = 10_000;

/** 沿用瀏覽器定位快取的有效期（毫秒）。 */
const GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000;

/** 座標保留的小數位數：和網址列上的格式一致，避免兩邊對不起來。 */
const COORDINATE_PRECISION = 4;

const IDLE_RESULT: GeolocationResult = { kind: 'idle' };

export function useCurrentLocation(
  enabled: boolean,
  reverseGeocoder: ReverseGeocoder,
): CurrentLocation {
  const [result, setResult] = useState<GeolocationResult>(IDLE_RESULT);

  // 渲染階段就能判斷瀏覽器支不支援定位，不必放進 effect。
  const isSupported = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);

  const unsupportedError = useMemo(
    () =>
      new AppError(
        'unsupported',
        '這個瀏覽器不支援定位功能，請改用搜尋選擇城市。',
      ),
    [],
  );

  useEffect(() => {
    if (!enabled || !isSupported) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 先確認沒有被取消，再發出反查請求 ——
        // 否則 React StrictMode 重複執行 effect 時，會多打一次上游。
        if (cancelled) return;

        const latitude = round(position.coords.latitude);
        const longitude = round(position.coords.longitude);

        void reverseGeocoder
          .reverse(latitude, longitude)
          .catch(() => null)
          .then((location) => {
            if (cancelled) return;
            // 反查失敗不讓整個流程失敗：退回只有座標的地點，
            // 天氣一樣看得到，只是名稱顯示「目前位置」。
            setResult({
              kind: 'ready',
              location: location ?? createFallbackLocation(latitude, longitude),
            });
          });
      },
      (error) => {
        if (cancelled) return;
        setResult({ kind: 'error', error: toGeolocationError(error) });
      },
      {
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
        enableHighAccuracy: false,
      },
    );

    return () => {
      cancelled = true;
    };
    // reverseGeocoder 必須是穩定的實例（App 層級是單例），
    // 否則每次 render 都會重新發起定位。
  }, [enabled, isSupported, reverseGeocoder]);

  if (!enabled) {
    return { location: null, status: 'idle', error: null };
  }
  if (!isSupported) {
    return { location: null, status: 'error', error: unsupportedError };
  }
  if (result.kind === 'error') {
    return { location: null, status: 'error', error: result.error };
  }
  if (result.kind === 'ready') {
    return { location: result.location, status: 'ready', error: null };
  }
  return { location: null, status: 'locating', error: null };
}

/** 只有座標、沒有地名的地點（反查失敗時的退路）。 */
function createFallbackLocation(latitude: number, longitude: number): Location {
  return {
    id: `geo-${latitude.toFixed(COORDINATE_PRECISION)},${longitude.toFixed(COORDINATE_PRECISION)}`,
    name: '目前位置',
    adminArea: null,
    country: null,
    countryCode: null,
    latitude,
    longitude,
    timezone: null,
  };
}

function round(value: number): number {
  return Number(value.toFixed(COORDINATE_PRECISION));
}

/** GeolocationPositionError → AppError。 */
function toGeolocationError(error: GeolocationPositionError): AppError {
  // 錯誤碼是瀏覽器定義的常數：1 = PERMISSION_DENIED、2 = POSITION_UNAVAILABLE、3 = TIMEOUT
  switch (error.code) {
    case 1:
      return new AppError(
        'permissionDenied',
        '無法取得你的位置（權限被拒絕），請改用搜尋選擇城市。',
      );
    case 2:
      return new AppError('unsupported', '目前無法取得你的位置，請改用搜尋選擇城市。');
    case 3:
      return new AppError('timeout', '取得位置逾時，請改用搜尋選擇城市。');
    default:
      return new AppError('unknown', '無法取得你的位置，請改用搜尋選擇城市。');
  }
}
