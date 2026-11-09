import { useCallback, useEffect } from 'react';
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

  useEffect(() => {
    if (!location) {
      reset();
      return;
    }
    void run(location, units);
  }, [location, units, run, reset]);

  const reload = useCallback(() => {
    if (location) void run(location, units);
  }, [location, units, run]);

  return {
    snapshot: state.data,
    status: state.status,
    error: state.error,
    isLoading: state.status === 'loading' && state.data === null,
    isRefreshing: state.isRefreshing,
    reload,
  };
}
