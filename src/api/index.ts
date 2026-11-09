import { createOpenMeteoProvider } from './openMeteoProvider';
import type { WeatherProvider } from './weatherProvider';

/**
 * Provider 工廠。
 *
 * 這是整個 App 唯一的「資料來源選擇點」。新增供應商時，
 * 只需要在這裡註冊，並把對應的 id 放進 VITE_WEATHER_PROVIDER 環境變數。
 */
export function createWeatherProvider(id = 'open-meteo'): WeatherProvider {
  switch (id) {
    case 'open-meteo':
      return createOpenMeteoProvider({
        language: import.meta.env.VITE_GEOCODING_LANGUAGE ?? undefined,
      });
    default:
      // 未知的 provider id 退回預設值，避免整個 App 起不來。
      console.warn(`[weather] 未知的資料來源 "${id}"，改用 open-meteo。`);
      return createOpenMeteoProvider({
        language: import.meta.env.VITE_GEOCODING_LANGUAGE ?? undefined,
      });
  }
}

export { createOpenMeteoProvider };
export type { WeatherProvider, ProviderCallOptions } from './weatherProvider';
