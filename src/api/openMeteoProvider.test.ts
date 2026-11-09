// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenMeteoProvider } from './openMeteoProvider';
import type { Location } from '../types/location';

const geocodePayload = {
  results: [
    {
      id: 1668341,
      name: '臺北市',
      latitude: 25.05306,
      longitude: 121.52639,
      country: '台灣',
      country_code: 'tw',
      admin1: '臺灣省 or 台灣省',
      timezone: 'Asia/Taipei',
    },
  ],
};

const forecastPayload = {
  timezone: 'Asia/Taipei',
  current: {
    time: '2026-11-09T17:15',
    temperature_2m: 19.2,
    apparent_temperature: 18.1,
    relative_humidity_2m: 78,
    precipitation: 0.1,
    weather_code: 3,
    wind_speed_10m: 14.4,
    wind_direction_10m: 45,
    is_day: 1,
  },
  daily: {
    time: ['2026-11-09', '2026-11-10'],
    weather_code: [3, 61],
    temperature_2m_max: [22.4, 20.7],
    temperature_2m_min: [17.1, 16.2],
    precipitation_probability_max: [10, 70],
    precipitation_sum: [0, 4.2],
    sunrise: ['2026-11-09T05:56', '2026-11-10T05:57'],
    sunset: ['2026-11-09T17:24', '2026-11-10T17:23'],
  },
};

const taipei: Location = {
  id: 'geo-1668341',
  name: '臺北市',
  adminArea: '臺灣省',
  country: '台灣',
  countryCode: 'TW',
  latitude: 25.05306,
  longitude: 121.52639,
  timezone: 'Asia/Taipei',
};

function mockJson(payload: unknown) {
  const spy = vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('openMeteo provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('把地理編碼結果轉換成領域模型，並清理多語系行政區欄位', async () => {
    mockJson(geocodePayload);
    const provider = createOpenMeteoProvider();

    const [location] = await provider.searchLocations('台北');

    expect(location).toMatchObject({
      id: 'geo-1668341',
      name: '臺北市',
      adminArea: '臺灣省',
      country: '台灣',
      countryCode: 'TW',
      timezone: 'Asia/Taipei',
    });
  });

  it('查不到地點時回傳空陣列而不是拋出例外', async () => {
    mockJson({});
    const provider = createOpenMeteoProvider();

    await expect(provider.searchLocations('zzzz')).resolves.toEqual([]);
  });

  it('把預報資料換算成使用者選擇的單位', async () => {
    mockJson(forecastPayload);
    const provider = createOpenMeteoProvider();

    const snapshot = await provider.fetchWeather(taipei, {
      temperature: 'fahrenheit',
      windSpeed: 'mph',
    });

    expect(snapshot.current.temperature).toBeCloseTo(66.56, 1);
    expect(snapshot.current.windSpeed).toBeCloseTo(8.95, 1);
    expect(snapshot.current.isDay).toBe(true);
    expect(snapshot.daily[0]!.temperatureMax).toBeCloseTo(72.32, 1);
    expect(snapshot.daily[1]!.precipitationProbability).toBe(70);
    expect(snapshot.daily[1]!.sunrise).toBe('2026-11-10T05:57');
  });

  it('保持攝氏時不做任何換算', async () => {
    mockJson(forecastPayload);
    const provider = createOpenMeteoProvider();

    const snapshot = await provider.fetchWeather(taipei, {
      temperature: 'celsius',
      windSpeed: 'kmh',
    });

    expect(snapshot.current.temperature).toBe(19.2);
    expect(snapshot.current.windSpeed).toBe(14.4);
  });

  it('HTTP 錯誤會被正規化成 AppError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    const provider = createOpenMeteoProvider();

    await expect(provider.searchLocations('台北')).rejects.toMatchObject({
      kind: 'server',
      status: 500,
    });
  });

  it('回傳無法解析的內容時會產生 parse 錯誤', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not-json', { status: 200 })),
    );
    const provider = createOpenMeteoProvider();

    await expect(provider.searchLocations('台北')).rejects.toMatchObject({
      kind: 'parse',
    });
  });
});
