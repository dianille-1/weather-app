// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createExpandedGeocoder } from './expandedGeocoder';
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

/** 只有在查詢等於 expected 時才回傳結果，用來模擬不同寫法的命中差異。 */
function fakeGeocoder(expected: string): Geocoder {
  return {
    id: 'fake',
    displayName: 'Fake',
    search: vi.fn(async (query: string) => (query === expected ? [taipei] : [])),
  };
}

describe('查詢展開', () => {
  it('原字串就查得到時不會嘗試其他變體', async () => {
    const inner = fakeGeocoder('台北');
    const geocoder = createExpandedGeocoder(inner);

    const results = await geocoder.search('台北');

    expect(results).toEqual([taipei]);
    expect(inner.search).toHaveBeenCalledTimes(1);
  });

  it('查不到時會改用變體，直到有結果為止', async () => {
    const inner = fakeGeocoder('臺中市');
    const geocoder = createExpandedGeocoder(inner, { maxVariants: 4 });

    const results = await geocoder.search('台中');

    expect(results).toEqual([taipei]);
    // 依序嘗試：台中 → 台中市 → 臺中 → 臺中市
    expect(inner.search).toHaveBeenCalledTimes(4);
  });

  it('所有變體都查不到時回傳空陣列', async () => {
    const inner = fakeGeocoder('不可能命中');
    const geocoder = createExpandedGeocoder(inner, { maxVariants: 4 });

    await expect(geocoder.search('台中')).resolves.toEqual([]);
    expect(inner.search).toHaveBeenCalledTimes(4);
  });

  it('變體重複時不會重複送出相同查詢', async () => {
    const inner = fakeGeocoder('不可能命中');
    const geocoder = createExpandedGeocoder(inner, { maxVariants: 4 });

    await geocoder.search('外太空');

    // 「外太空」沒有台／臺的差異，因此只有「外太空」與「外太空市」兩種寫法。
    expect(inner.search).toHaveBeenCalledTimes(2);
  });

  it('變體次數上限會限制嘗試次數', async () => {
    const inner = fakeGeocoder('不可能命中');
    const geocoder = createExpandedGeocoder(inner, { maxVariants: 2 });

    await geocoder.search('台中');

    expect(inner.search).toHaveBeenCalledTimes(2);
  });
});
