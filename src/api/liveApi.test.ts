import { describe, expect, it } from 'vitest';
import { createOpenMeteoProvider } from './openMeteoProvider';

/**
 * 對「真正的」Open-Meteo API 做一次煙霧測試。
 *
 * 預設是略過的（一般 CI 不應該依賴外網），
 * 需要驗證真實 API 行為時用以下指令啟用：
 *
 *   LIVE_API_TESTS=1 npm test
 */
const liveIt = process.env.LIVE_API_TESTS ? it : it.skip;

describe('Open-Meteo 實際 API', () => {
  liveIt(
    '可以搜尋地點並取得天氣資料',
    async () => {
      const provider = createOpenMeteoProvider();

      const [location] = await provider.searchLocations('台北');
      expect(location).toBeDefined();
      expect(location?.latitude).toBeCloseTo(25.05, 1);

      const snapshot = await provider.fetchWeather(location!, {
        temperature: 'celsius',
        windSpeed: 'kmh',
      });

      expect(snapshot.current.temperature).toBeGreaterThan(-90);
      expect(snapshot.current.temperature).toBeLessThan(60);
      expect(snapshot.daily.length).toBeGreaterThan(3);
      expect(snapshot.timezone).toBeTruthy();
    },
    20_000,
  );
});
