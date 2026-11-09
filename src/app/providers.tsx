import { useMemo, useState, type ReactNode } from 'react';
import { createGeocodingServices, createWeatherProvider } from '../api';
import { DataSourceContext, type DataSources } from './dataSources';
import { PreferencesContext, type Preferences } from './preferences';
import { ToneContext, type ToneContextValue } from './tone';
import { toggleTemperatureUnit, useUnits } from '../hooks/useUnits';
import { useRecentLocations } from '../hooks/useRecentLocations';
import type { WeatherTone } from '../utils/weatherCodes';

/**
 * App 層級的 Providers。
 *
 * 集中在這一個檔案，是為了讓 App.tsx 能用三行把整個應用程式組裝起來，
 * 而且每個 Provider 的職責一目了然。
 * context 本身放在各自的 .ts（preferences.ts / tone.ts / dataSources.ts），
 * 這裡只放元件 —— 這樣熱更新時不會因為混合匯出而退化成整頁重載。
 */

/** 資料來源服務（天氣預報 + 地名搜尋 + 反查）。 */
export function DataSourceProvider({ children }: { children: ReactNode }) {
  // useMemo 讓實例在 App 的生命週期內只建立一次（快取因此有效）。
  const value = useMemo<DataSources>(() => {
    const { geocoder, reverseGeocoder } = createGeocodingServices();
    return {
      weatherProvider: createWeatherProvider(
        import.meta.env.VITE_WEATHER_PROVIDER ?? 'open-meteo',
      ),
      geocoder,
      reverseGeocoder,
    };
  }, []);

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

/** 使用者偏好（單位、最近瀏覽）。 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useUnits();
  const { locations, add, remove, clear } = useRecentLocations();

  const value = useMemo<Preferences>(
    () => ({
      units,
      setUnits,
      toggleTemperatureUnit: () => setUnits(toggleTemperatureUnit(units)),
      recentLocations: locations,
      addRecentLocation: add,
      removeRecentLocation: remove,
      clearRecentLocations: clear,
    }),
    [units, setUnits, locations, add, remove, clear],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/** 介面色調（由天氣頁回報給外框）。 */
export function ToneProvider({ children }: { children: ReactNode }) {
  const [tone, setTone] = useState<WeatherTone>('neutral');
  const value = useMemo<ToneContextValue>(() => ({ tone, setTone }), [tone]);

  return <ToneContext.Provider value={value}>{children}</ToneContext.Provider>;
}

/** 供 App.tsx 依序套用的 Provider 集合。 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <DataSourceProvider>
      <PreferencesProvider>
        <ToneProvider>{children}</ToneProvider>
      </PreferencesProvider>
    </DataSourceProvider>
  );
}
