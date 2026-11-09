import { useCallback, useEffect, useMemo, useState } from 'react';
import { createWeatherProvider } from './api';
import { CurrentConditions } from './components/CurrentConditions';
import { EmptyState } from './components/EmptyState';
import { ErrorNotice } from './components/ErrorNotice';
import { ForecastSection } from './components/ForecastSection';
import { RecentLocations } from './components/RecentLocations';
import { SearchPanel } from './components/SearchPanel';
import { UnitToggle } from './components/UnitToggle';
import { WeatherSkeleton } from './components/WeatherSkeleton';
import { useRecentLocations } from './hooks/useRecentLocations';
import { useUnits } from './hooks/useUnits';
import { useWeather } from './hooks/useWeather';
import type { Location } from './types/location';
import { describeWeather } from './utils/weatherCodes';
import { parseLocationFromSearch, syncLocationToUrl } from './utils/urlState';
import styles from './App.module.css';

/**
 * App 根元件：負責「跨元件」的狀態（選取的地點、單位偏好），
 * 其餘狀態都封裝在各自的 hook / 元件裡。
 *
 * 這裡刻意不引入 Redux / Zustand 等狀態管理套件：
 * 目前的需求只有「一個被選取的地點 + 一組偏好設定 + 兩份遠端資料」，
 * 用 React 內建能力 + 一個可重用的 async hook 就足以應付，
 * 少一個相依套件 = 少一份維護成本。
 */
export default function App() {
  const provider = useMemo(
    () => createWeatherProvider(import.meta.env.VITE_WEATHER_PROVIDER ?? 'open-meteo'),
    [],
  );

  // 初始狀態可以從網址列還原（?lat=..&lon=..&name=..），讓天氣頁面可以直接分享。
  const [selected, setSelected] = useState<Location | null>(() =>
    parseLocationFromSearch(window.location.search),
  );
  const [units, setUnits] = useUnits();
  const { locations: recentLocations, add: addRecent, remove: removeRecent } = useRecentLocations();
  const weather = useWeather(provider, selected, units);

  // 選取地點後把座標同步到網址列（replaceState，不污染瀏覽紀錄）。
  useEffect(() => {
    if (selected) syncLocationToUrl(selected);
  }, [selected]);

  const handleSelect = useCallback(
    (location: Location) => {
      setSelected(location);
      addRecent(location);
    },
    [addRecent],
  );

  // 背景色會隨目前天況變化（晴 → 暖黃、雨 → 冷藍…）。
  const tone = weather.snapshot
    ? describeWeather(weather.snapshot.current.weatherCode).tone
    : 'neutral';

  return (
    <div className={styles.app} data-tone={tone}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <circle cx="13" cy="12" r="5" fill="currentColor" />
              <path
                d="M9.6 23.4h12.1a4.2 4.2 0 0 0 .5-8.37A6.3 6.3 0 0 0 10.2 12.7 4.7 4.7 0 0 0 9.6 23.4Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div>
            <h1 className={styles.title}>天氣 App</h1>
            <p className={styles.subtitle}>即時天氣與未來一週預報</p>
          </div>
        </div>
        <UnitToggle units={units} onChange={setUnits} />
      </header>

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <SearchPanel provider={provider} onSelect={handleSelect} />
          <RecentLocations
            locations={recentLocations}
            onSelect={handleSelect}
            onRemove={removeRecent}
          />
        </aside>

        <section className={styles.content}>
          {weather.error ? (
            <ErrorNotice
              error={weather.error}
              title="無法取得天氣資料"
              onRetry={weather.reload}
            />
          ) : null}

          {weather.isRefreshing ? (
            <p className={styles.refreshing} role="status">
              更新中…
            </p>
          ) : null}

          {weather.isLoading ? <WeatherSkeleton /> : null}

          {!weather.isLoading && !weather.snapshot && !weather.error ? <EmptyState /> : null}

          {weather.snapshot ? (
            <>
              <CurrentConditions snapshot={weather.snapshot} />
              <ForecastSection daily={weather.snapshot.daily} units={units} />
            </>
          ) : null}
        </section>
      </main>

      <footer className={styles.footer}>
        天氣資料來源：{provider.displayName}（免註冊 API）· 前端技術作業成果
      </footer>
    </div>
  );
}
