/**
 * 極簡的記憶體 TTL 快取。
 *
 * 用途：使用者切回剛才看過的城市時直接命中，不必重新打 API。
 * 刻意不做成「通用快取框架」——需求很小，一個 Map 就夠，
 * 需要持久化時再換成 localStorage / IndexedDB 即可。
 */
export interface TtlCache<T> {
  get(key: string): T | undefined;
  set(key: string, value: T): void;
  clear(): void;
}

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  const store = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear() {
      store.clear();
    },
  };
}
