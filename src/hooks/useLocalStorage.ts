import { useCallback, useEffect, useState } from 'react';

export type SetValue<T> = T | ((previous: T) => T);

export interface LocalStorageOptions<T> {
  /**
   * 從 localStorage 讀出原始值後的驗證／轉換函式。
   * 回傳 null 代表資料格式不正確，會退回初始值
   * （localStorage 的內容可以被使用者手動改掉，不能盲信）。
   */
  revive?: (raw: unknown) => T | null;
}

/**
 * 與 localStorage 同步的 state。
 *
 * 所有讀寫都包在 try/catch：隱私瀏覽器或配額用盡時
 * localStorage 可能直接拋錯，不該讓整個 App 壞掉。
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: LocalStorageOptions<T> = {},
): [T, (value: SetValue<T>) => void] {
  const { revive } = options;
  const [value, setValue] = useState<T>(() => readStoredValue(key, initialValue, revive));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 寫入失敗（隱私模式 / 配額滿）時靜默忽略：這只是個偏好設定，
      // 存不下來不應該影響主要功能。
    }
  }, [key, value]);

  const setStoredValue = useCallback((next: SetValue<T>) => {
    setValue((previous) =>
      typeof next === 'function' ? (next as (previous: T) => T)(previous) : next,
    );
  }, []);

  return [value, setStoredValue];
}

function readStoredValue<T>(key: string, initialValue: T, revive?: (raw: unknown) => T | null): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return initialValue;
    const parsed: unknown = JSON.parse(raw);
    if (revive) return revive(parsed) ?? initialValue;
    return parsed as T;
  } catch {
    return initialValue;
  }
}
