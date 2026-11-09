import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppError } from '../api/errors';

/**
 * 非同步資源的狀態機。
 *
 * 為什麼不用 `useState<{loading, data, error}>`？
 *  - 狀態組合會爆炸（loading + error + data 同時存在的情況難以窮舉）
 *  - 競態（race condition）難以處理：使用者快速切換城市時，
 *    晚回來的舊請求可能覆蓋新請求的結果
 *
 * 這個 hook 用「請求序號 + AbortController」同時解決上述兩點：
 *  1. 新請求一啟動就中止前一個請求（省頻寬）
 *  2. 即使舊請求已經在路上，回應也會因為序號不符而被丟棄
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<TData> {
  status: AsyncStatus;
  data: TData | null;
  error: AppError | null;
  /** 重新整理中：代表已有舊資料可以繼續顯示。 */
  isRefreshing: boolean;
}

type Action<TData> =
  | { type: 'loading' }
  | { type: 'success'; data: TData }
  | { type: 'error'; error: AppError }
  | { type: 'aborted' }
  | { type: 'reset' };

const initialState = <TData,>(): AsyncState<TData> => ({
  status: 'idle',
  data: null,
  error: null,
  isRefreshing: false,
});

function reducer<TData>(state: AsyncState<TData>, action: Action<TData>): AsyncState<TData> {
  switch (action.type) {
    case 'loading':
      return {
        status: 'loading',
        data: state.data,
        error: null,
        isRefreshing: state.data !== null,
      };
    case 'success':
      return { status: 'success', data: action.data, error: null, isRefreshing: false };
    case 'error':
      // 保留既有資料，讓使用者仍看得到上一次的結果，錯誤另外以橫幅呈現。
      return { status: 'error', data: state.data, error: action.error, isRefreshing: false };
    case 'aborted':
      // 請求被中止且沒有後續請求接手：回到 idle，
      // 否則畫面會永遠停在 loading。
      return { status: 'idle', data: state.data, error: null, isRefreshing: false };
    case 'reset':
      return initialState<TData>();
  }
}

export interface AsyncResource<TArgs extends unknown[], TData> {
  state: AsyncState<TData>;
  /** 執行（若已在執行中，會中止前一次）。 */
  run: (...args: TArgs) => Promise<void>;
  /** 清空狀態並中止進行中的請求。 */
  reset: () => void;
}

export function useAsyncResource<TArgs extends unknown[], TData>(
  task: (signal: AbortSignal, ...args: TArgs) => Promise<TData>,
): AsyncResource<TArgs, TData> {
  const [state, dispatch] = useReducer(reducer<TData>, undefined, initialState<TData>);

  const taskRef = useRef(task);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  // 把最新的 task 存進 ref：run 的身分保持穩定，
  // 呼叫端可以安心地把 run 放進 useEffect 的依賴陣列而不會造成無限迴圈。
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback(async (...args: TArgs) => {
    // 1. 中止上一個請求，避免浪費頻寬，也避免舊回應覆蓋新結果。
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    dispatch({ type: 'loading' });

    try {
      const data = await taskRef.current(controller.signal, ...args);
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      dispatch({ type: 'success', data });
    } catch (error) {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      const appError = AppError.from(error);
      if (appError.kind === 'aborted') {
        // 只有在「這仍是最新的一次請求」時才會走到這裡，
        // 代表請求是被外部中止而非被新的請求取代，因此狀態要收尾。
        dispatch({ type: 'aborted' });
        return;
      }
      dispatch({ type: 'error', error: appError });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    requestIdRef.current += 1;
    dispatch({ type: 'reset' });
  }, []);

  return { state, run, reset };
}
