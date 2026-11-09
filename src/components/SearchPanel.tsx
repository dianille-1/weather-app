import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { WeatherProvider } from '../api/weatherProvider';
import { MIN_QUERY_LENGTH, useLocationSearch } from '../hooks/useLocationSearch';
import type { Location } from '../types/location';
import { ErrorNotice } from './ErrorNotice';
import { Spinner } from './Spinner';
import styles from './SearchPanel.module.css';

interface Props {
  provider: WeatherProvider;
  onSelect: (location: Location) => void;
}

/**
 * 地名搜尋面板。
 *
 * 內含完整的搜尋體驗：
 *   - 300ms debounce，避免每敲一個字就發請求
 *   - 鍵盤操作（↑ / ↓ 切換、Enter 選取、Esc 清除）
 *   - 載入中 / 錯誤 / 查無結果 三種明確狀態
 *   - ARIA listbox 語意，螢幕閱讀器可正確朗讀
 */
export function SearchPanel({ provider, onSelect }: Props) {
  const [query, setQuery] = useState('');
  // 以「地點 id」而不是索引記錄選取中的項目：
  // 結果換一批時，舊 id 不存在 → activeIndex 自然變成 -1，
  // 不需要額外的 effect 去同步狀態。
  const [activeId, setActiveId] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useLocationSearch(provider, query);

  const activeIndex =
    activeId === null ? -1 : search.results.findIndex((item) => item.id === activeId);

  const handleSelect = (location: Location) => {
    onSelect(location);
    setQuery('');
    setActiveId(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { results } = search;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveId((currentId) => {
        const currentIndex =
          currentId === null ? -1 : results.findIndex((item) => item.id === currentId);
        const nextIndex = Math.min(currentIndex + 1, results.length - 1);
        return results[nextIndex]?.id ?? null;
      });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveId((currentId) => {
        const currentIndex =
          currentId === null ? -1 : results.findIndex((item) => item.id === currentId);
        const nextIndex = Math.max(currentIndex - 1, -1);
        return nextIndex === -1 ? null : (results[nextIndex]?.id ?? null);
      });
      return;
    }
    if (event.key === 'Enter') {
      const target = results[activeIndex];
      if (target) {
        event.preventDefault();
        handleSelect(target);
      }
      return;
    }
    if (event.key === 'Escape') {
      setQuery('');
      setActiveId(null);
    }
  };

  const hasQuery = query.trim().length > 0;
  const showEmptyMessage =
    search.status === 'success' && search.results.length === 0 && !search.isTooShort;

  return (
    <section className={styles.panel} aria-label="搜尋地點">
      <div className={styles.field}>
        <span className={styles.searchIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </span>

        <label className="srOnly" htmlFor={`${listId}-input`}>
          搜尋城市或地點
        </label>
        <input
          id={`${listId}-input`}
          ref={inputRef}
          className={styles.input}
          type="search"
          value={query}
          placeholder="搜尋城市或地點…"
          autoComplete="off"
          role="combobox"
          aria-expanded={search.results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        {search.isLoading ? <Spinner className={styles.spinner} /> : null}

        {hasQuery ? (
          <button
            type="button"
            className={styles.clear}
            onClick={() => {
              setQuery('');
              setActiveId(null);
              inputRef.current?.focus();
            }}
            aria-label="清除搜尋"
          >
            ×
          </button>
        ) : null}
      </div>

      {search.error ? (
        <ErrorNotice
          error={search.error}
          title="搜尋失敗"
          onRetry={search.retry}
        />
      ) : null}

      {search.isTooShort && hasQuery ? (
        <p className={styles.hint}>請輸入至少 {MIN_QUERY_LENGTH} 個字元。</p>
      ) : null}

      {showEmptyMessage ? (
        <p className={styles.hint}>找不到符合「{query.trim()}」的地點，請試試其他關鍵字。</p>
      ) : null}

      {search.results.length > 0 ? (
        <ul className={styles.results} id={listId} role="listbox" aria-label="搜尋結果">
          {search.results.map((location, index) => (
            <li key={location.id} role="presentation">
              <button
                type="button"
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? `${styles.result} ${styles.active}` : styles.result}
                onMouseEnter={() => setActiveId(location.id)}
                onClick={() => handleSelect(location)}
              >
                <span className={styles.resultName}>
                  {location.countryCode ? <span aria-hidden="true">{flagEmoji(location.countryCode)}</span> : null}
                  {location.name}
                </span>
                <span className={styles.resultMeta}>{describePlace(location)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** 地點副標題：行政區 + 國家，避免重複顯示相同資訊。 */
function describePlace(location: Location): string {
  const parts = [location.adminArea, location.country].filter(
    (part): part is string => Boolean(part) && part !== location.name,
  );
  return parts.length > 0 ? parts.join(' · ') : location.countryCode ?? '';
}

/** 兩字母國旗碼轉成 emoji 旗幟。 */
function flagEmoji(countryCode: string): string {
  if (countryCode.length !== 2) return '';
  const codePoints = [...countryCode.toUpperCase()].map(
    (char) => 127397 + char.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}
