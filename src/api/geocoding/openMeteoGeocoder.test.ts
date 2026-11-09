// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenMeteoGeocoder } from './openMeteoGeocoder';

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

describe('openMeteo 地理編碼', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('把地理編碼結果轉換成領域模型，並清理多語系行政區欄位', async () => {
    mockJson(geocodePayload);
    const geocoder = createOpenMeteoGeocoder();

    const [location] = await geocoder.search('台北');

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
    const geocoder = createOpenMeteoGeocoder();

    await expect(geocoder.search('zzzz')).resolves.toEqual([]);
  });

  it('HTTP 錯誤會被正規化成 AppError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    const geocoder = createOpenMeteoGeocoder();

    await expect(geocoder.search('台北')).rejects.toMatchObject({
      kind: 'server',
      status: 500,
    });
  });

  it('回傳無法解析的內容時會產生 parse 錯誤', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not-json', { status: 200 })),
    );
    const geocoder = createOpenMeteoGeocoder();

    await expect(geocoder.search('台北')).rejects.toMatchObject({
      kind: 'parse',
    });
  });
});
