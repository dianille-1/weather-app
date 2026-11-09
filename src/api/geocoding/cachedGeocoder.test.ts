// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createCachedGeocoder } from './cachedGeocoder';
import type { Geocoder } from './geocoder';
import type { Location } from '../../types/location';

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

function fakeGeocoder(results: Location[]): Geocoder {
  return {
    id: 'fake',
    displayName: 'Fake',
    search: vi.fn(async () => results),
  };
}

describe('快取地理編碼', () => {
  it('相同查詢在有效期限內只會呼叫上游一次', async () => {
    const inner = fakeGeocoder([taipei]);
    const geocoder = createCachedGeocoder(inner, 60_000);

    await geocoder.search('台北');
    await geocoder.search('台北');

    expect(inner.search).toHaveBeenCalledTimes(1);
  });

  it('查詢字串會去空白並忽略大小寫', async () => {
    const inner = fakeGeocoder([taipei]);
    const geocoder = createCachedGeocoder(inner, 60_000);

    await geocoder.search(' Taipei ');
    await geocoder.search('taipei');

    expect(inner.search).toHaveBeenCalledTimes(1);
  });

  it('查無結果也會被快取，避免反覆打上游', async () => {
    const inner = fakeGeocoder([]);
    const geocoder = createCachedGeocoder(inner, 60_000);

    await geocoder.search('zzzz');
    await geocoder.search('zzzz');

    expect(inner.search).toHaveBeenCalledTimes(1);
  });

  it('超過有效期限後會重新查詢', async () => {
    const inner = fakeGeocoder([taipei]);
    const geocoder = createCachedGeocoder(inner, 0);

    await geocoder.search('台北');
    await geocoder.search('台北');

    expect(inner.search).toHaveBeenCalledTimes(2);
  });
});
