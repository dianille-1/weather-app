import type { Location } from '../types/location';
import type { Units, WeatherSnapshot } from '../types/weather';

/**
 * 天氣資料來源的抽象介面。
 *
 * 這是整個 App 最重要的取捨之一：UI 與 hooks 只依賴這個介面，
 * 不依賴任何特定 API。未來要接付費服務（如 OpenWeatherMap）或自建後端，
 * 只要再寫一個 provider 並在 factories.ts 註冊即可，元件完全不用改。
 */
export interface ProviderCallOptions {
  /** 支援取消請求，用來處理「使用者快速連續搜尋」造成的競態。 */
  signal?: AbortSignal;
}

export interface WeatherProvider {
  /** 供應商識別碼，用於 log 與除錯。 */
  readonly id: string;
  /** 顯示名稱。 */
  readonly displayName: string;
  /** 以關鍵字搜尋地點。 */
  searchLocations(query: string, options?: ProviderCallOptions): Promise<Location[]>;
  /** 取得某個地點的即時天氣與預報。 */
  fetchWeather(
    location: Location,
    units: Units,
    options?: ProviderCallOptions,
  ): Promise<WeatherSnapshot>;
}
