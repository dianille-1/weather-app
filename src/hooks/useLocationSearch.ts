import { useCallback, useEffect } from 'react';
import type { AppError } from '../api/errors';
import type { WeatherProvider } from '../api/weatherProvider';
import type { Location } from '../types/location';
import { useAsyncResource } from './useAsyncResource';
import type { AsyncStatus } from './useAsyncResource';
import { useDebouncedValue } from './useDebouncedValue';

/** 少於這個字數就不送查詢，避免打出一堆無關結果。 */
export const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_RESULTS: Location[] = [];

export interface LocationSearch {
  results: Location[];
  status: AsyncStatus;
  error: AppError | null;
  /** 首次載入中（還沒有任何舊資料可以顯示）。 */
  isLoading: boolean;
  /** 查詢字串太短，尚未送出查詢。 */
  isTooShort: boolean;
  retry: () => void;
}

/**
 * 地名搜尋。
 *
 * 結合三個機制處理搜尋的各種邊界情況：
 *   1. debounce：避免每敲一個字就打一次 API
 *   2. AbortController + 請求序號：舊請求即使回來也不會覆蓋新結果
 *   3. 最短字數限制：避免無意义的請求
 */
export function useLocationSearch(provider: WeatherProvider, query: string): LocationSearch {
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const isTooShort = debouncedQuery.length < MIN_QUERY_LENGTH;

  const task = useCallback(
    (signal: AbortSignal, term: string) => provider.searchLocations(term, { signal }),
    [provider],
  );
  const { state, run, reset } = useAsyncResource(task);

  useEffect(() => {
    if (isTooShort) {
      reset();
      return;
    }
    void run(debouncedQuery);
  }, [debouncedQuery, isTooShort, run, reset]);

  const retry = useCallback(() => {
    if (!isTooShort) void run(debouncedQuery);
  }, [debouncedQuery, isTooShort, run]);

  return {
    results: state.data ?? EMPTY_RESULTS,
    status: state.status,
    error: state.error,
    isLoading: state.status === 'loading' && state.data === null,
    isTooShort,
    retry,
  };
}
