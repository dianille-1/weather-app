// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createGeocodingServices } from './index';
import { createOpenMeteoProvider } from './openMeteoProvider';

/**
 * 對「真正的」Open-Meteo / Nominatim API 做一次煙霧測試。
 *
 * 預設是略過的（一般 CI 不應該依賴外網），
 * 需要驗證真實 API 行為時用以下指令啟用：
 *
 *   LIVE_API_TESTS=1 npm test
 *
 * 這個測試同時驗證了整條搜尋鏈路：
 * Open-Meteo → 查詢展開 → Nominatim → 快取。
 * 開頭那幾個中文地名在單一來源都查不到（Open-Meteo 的中文索引查不到「台北」、
 * 「台中」、「桃園」），必須靠展開與備援來源才有結果。
 */
const liveIt = process.env.LIVE_API_TESTS ? it : it.skip;

describe('真實 API 煙霧測試', () => {
  liveIt(
    '中文地名在單一來源查不到時，整條鏈路仍能找到',
    async () => {
      const { geocoder } = createGeocodingServices();

      // 逐一查詢，避免一次併發太多請求觸發 Nominatim 的頻率限制。
      for (const query of ['台北', '台中', '桃園', '高雄', '臺中']) {
        const results = await geocoder.search(query);
        expect(results.length, `「${query}」應該要查得到結果`).toBeGreaterThan(0);
      }
    },
    60_000,
  );

  liveIt(
    '英文地名也能正常查詢',
    async () => {
      const { geocoder } = createGeocodingServices();

      const results = await geocoder.search('Tokyo');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.latitude).toBeCloseTo(35.68, 1);
    },
    30_000,
  );

  liveIt(
    '由座標可以反查回城市名稱',
    async () => {
      const { reverseGeocoder } = createGeocodingServices();

      const location = await reverseGeocoder.reverse(25.033, 121.565);

      expect(location?.name).toContain('臺北');
      expect(location?.country).toBeTruthy();
    },
    30_000,
  );

  liveIt(
    '可以取得天氣資料',
    async () => {
      const provider = createOpenMeteoProvider();
      const location = {
        id: 'geo-1668341',
        name: '臺北市',
        adminArea: '臺灣省',
        country: '台灣',
        countryCode: 'TW',
        latitude: 25.05306,
        longitude: 121.52639,
        timezone: 'Asia/Taipei',
      };

      const snapshot = await provider.fetchWeather(location, {
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
