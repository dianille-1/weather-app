import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataSources } from '../app/dataSources';
import { usePreferences } from '../app/preferences';
import { useReportTone } from '../app/tone';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorNotice } from '../components/common/ErrorNotice';
import { RecentLocations } from '../components/search/RecentLocations';
import { SearchPanel } from '../components/search/SearchPanel';
import { CurrentConditions } from '../components/weather/CurrentConditions';
import { ForecastSection } from '../components/weather/ForecastSection';
import { WeatherSkeleton } from '../components/weather/WeatherSkeleton';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useWeather } from '../hooks/useWeather';
import type { Location } from '../types/location';
import { describeWeather } from '../utils/weatherCodes';
import { buildLocationSearch, parseLocationFromSearch } from '../utils/urlState';
import styles from './WeatherPage.module.css';

/**
 * 天氣頁（路由 `/`）。
 *
 * 這個頁面只做三件事：
 *   1. 決定「要看哪個地方」：網址列有城市就用網址列的，沒有就用使用者所在位置
 *   2. 依地點與單位取得天氣資料
 *   3. 組出畫面
 *
 * 網址列是「目前顯示哪個城市」的唯一真實來源：
 *   - 讀取：useSearchParams → parseLocationFromSearch
 *   - 寫入：setSearchParams（replace，不污染瀏覽紀錄）
 * 這也表示「重新整理 / 分享連結」會回到同一個城市，之後新增頁面時
 * 不必另外設計一套狀態同步機制。
 */
export function WeatherPage() {
  const { weatherProvider, geocoder, reverseGeocoder } = useDataSources();
  const { units, recentLocations, addRecentLocation, removeRecentLocation } = usePreferences();
  const [searchParams, setSearchParams] = useSearchParams();

  const selected = useMemo(() => parseLocationFromSearch(searchParams), [searchParams]);

  // 還沒有選任何城市時，預設顯示使用者所在位置的當地天氣。
  const currentLocation = useCurrentLocation(selected === null, reverseGeocoder);

  // 天氣資料一律以「網址列上的城市」為準：自動定位的結果會先寫回網址列，
  // 再由這裡讀出來。這樣「顯示的地方」永遠只有一個來源。
  const weather = useWeather(weatherProvider, selected, units);

  // 自動定位到的城市也寫回網址列：網址列描述的永遠是畫面上顯示的那個地方，
  // 分享出去的連結才會是對的內容。
  useEffect(() => {
    if (selected || !currentLocation.location) return;
    setSearchParams(buildLocationSearch(currentLocation.location), { replace: true });
  }, [selected, currentLocation.location, setSearchParams]);

  // 背景色調跟著目前天況變化（晴 → 暖黃、雨 → 冷藍…）。
  const tone = weather.snapshot
    ? describeWeather(weather.snapshot.current.weatherCode).tone
    : 'neutral';
  useReportTone(tone);

  const handleSelect = useCallback(
    (location: Location) => {
      setSearchParams(buildLocationSearch(location), { replace: true });
      addRecentLocation(location);
    },
    [setSearchParams, addRecentLocation],
  );

  const isLocating = selected === null && currentLocation.status === 'locating';

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <SearchPanel geocoder={geocoder} onSelect={handleSelect} />
        <RecentLocations
          locations={recentLocations}
          onSelect={handleSelect}
          onRemove={removeRecentLocation}
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

        {isLocating ? (
          <>
            {/* 骨架屏本身是 aria-hidden 的裝飾，這裡補一個螢幕閱讀器可讀的狀態。 */}
            <p className="srOnly" role="status">
              正在取得你的位置…
            </p>
            <WeatherSkeleton />
          </>
        ) : null}

        {weather.isLoading ? (
          <>
            <p className="srOnly" role="status">
              正在載入天氣資料…
            </p>
            <WeatherSkeleton />
          </>
        ) : null}

        {!isLocating && !weather.isLoading && !weather.snapshot && !weather.error ? (
          <EmptyState
            hint={
              currentLocation.status === 'error' && currentLocation.error
                ? currentLocation.error.message
                : undefined
            }
          />
        ) : null}

        {weather.snapshot ? (
          <>
            <CurrentConditions snapshot={weather.snapshot} />
            <ForecastSection daily={weather.snapshot.daily} units={units} />
          </>
        ) : null}
      </section>
    </div>
  );
}
