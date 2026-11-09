import { useEffect, useRef, useState } from 'react';
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
 */
export type CurrentLocationStatus = 'idle' | 'locating' | 'ready' | 'error';

export interface CurrentLocation {
  /** 已解析的地點；反查失敗時會是一個只有座標的最小地點。 */
  location: Location | null;
  status: CurrentLocationStatus;
  error: AppError | null;
}

/** 定位逾時時間（毫秒）。 */
const GEOLOCATION_TIMEOUT_MS = 10_000;

/** 沿用瀏覽器定位快取的有效期（毫秒）。 */
const GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000;

const INITIAL_STATE: CurrentLocation = { location: null, status: 'idle', error: null };

export function useCurrentLocation(
  enabled: boolean,
  reverseGeocoder: ReverseGeocoder,
): CurrentLocation {
  const [state, setState] = useState<CurrentLocation>(INITIAL_STATE);

  // 用 ref 持有最新的反查服務：effect 只依賴 enabled。
  // 反查服務在 App 裡是單一實例，但如果呼叫端傳入的實例身分變了，
  // 也不該重新觸發定位（否則會變成「定位 → 重新定位」的死循環）。
  const reverseGeocoderRef = useRef(reverseGeocoder);
  reverseGeocoderRef.current = reverseGeocoder;

  useEffect(() => {
    if (!enabled) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        location: null,
        status: 'error',
        error: new AppError('unsupported', '這個瀏覽器不支援定位功能，請改用搜尋選擇城市。'),
      });
      return;
    }

    let cancelled = false;
    setState({ location: null, status: 'locating', error: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        void reverseGeocoderRef.current
          .reverse(latitude, longitude)
          .catch(() => null)
          .then((location) => {
            if (cancelled) return;
            // 反查失敗不讓整個流程失敗：退回只有座標的地點，
            // 天氣一樣看得到，只是名稱顯示「目前位置」。
            setState({
              location: location ?? createFallbackLocation(latitude, longitude),
              status: 'ready',
              error: null,
            });
          });
      },
      (error) => {
        if (cancelled) return;
        setState({ location: null, status: 'error', error: toGeolocationError(error) });
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
  }, [enabled]);

  return state;
}

/** 只有座標、沒有地名的地點（反查失敗時的退路）。 */
function createFallbackLocation(latitude: number, longitude: number): Location {
  return {
    id: `geo-${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    name: '目前位置',
    adminArea: null,
    country: null,
    countryCode: null,
    latitude,
    longitude,
    timezone: null,
  };
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
      return new AppError(
        'unsupported',
        '目前無法取得你的位置，請改用搜尋選擇城市。',
      );
    case 3:
      return new AppError('timeout', '取得位置逾時，請改用搜尋選擇城市。');
    default:
      return new AppError('unknown', '無法取得你的位置，請改用搜尋選擇城市。');
  }
}
