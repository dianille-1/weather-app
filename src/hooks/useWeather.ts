import { useCallback, useEffect, useRef } from 'react';
import type { AppError } from '../api/errors';
import type { WeatherProvider } from '../api/weatherProvider';
import type { Location } from '../types/location';
import type { Units, WeatherSnapshot } from '../types/weather';
import { useAsyncResource } from './useAsyncResource';
import type { AsyncStatus } from './useAsyncResource';

export interface WeatherState {
  snapshot: WeatherSnapshot | null;
  status: AsyncStatus;
  error: AppError | null;
  /** 首次載入中（尚無舊資料）。 */
  isLoading: boolean;
  /** 重新整理中（已有舊資料，畫面仍可顯示）。 */
  isRefreshing: boolean;
  reload: () => void;
}

/**
 * 取某個地點的天氣資料。
 *
 * 當「地點」或「單位」改變時會自動重新查詢；
 * 查詢期間保留上一次的資料，避免畫面閃爍。
 *
 * 判斷「是否需要重新查詢」用的是**座標**而不是地點物件的身分：
 * 同一個地方可能會被換成另一個等價的物件（例如自動定位得到的地點
 * 寫回網址列後，會變成從網址列還原出來的另一個物件），
 * 那種情況不該重新打一次 API。
 */
export function useWeather(
  provider: WeatherProvider,
  location: Location | null,
  units: Units,
): WeatherState {
  const task = useCallback(
    (signal: AbortSignal, target: Location, targetUnits: Units) =>
      provider.fetchWeather(target, targetUnits, { signal }),
    [provider],
  );
  const { state, run, reset } = useAsyncResource(task);

  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;

  // 保存最新的地點物件：effect 只依賴座標，但要把完整的物件傳給 provider。
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    const target = locationRef.current;
    if (!target || latitude === null || longitude === null) {
      reset();
      return;
    }
    void run(target, units);
  }, [latitude, longitude, units, run, reset]);

  const reload = useCallback(() => {
    const target = locationRef.current;
    if (target) void run(target, units);
  }, [units, run]);

  return {
    snapshot: state.data,
    status: state.status,
    error: state.error,
    isLoading: state.status === 'loading' && state.data === null,
    isRefreshing: state.isRefreshing,
    reload,
  };
}
