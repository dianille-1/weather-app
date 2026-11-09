import { useEffect, useState } from 'react';

/**
 * 防抖（debounce）值。
 *
 * 用於搜尋框：使用者每敲一個字就打一次 API 實在太浪費，
 * 這裡等使用者停止輸入 delayMs 毫秒後才送出查詢。
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
