// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createFallbackGeocoder } from './fallbackGeocoder';
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

function fakeGeocoder(results: Location[] | Error): Geocoder {
  return {
    id: 'fake',
    displayName: 'Fake',
    search: vi.fn(async () => {
      if (results instanceof Error) throw results;
      return results;
    }),
  };
}

describe('備援地理編碼', () => {
  it('主來源有結果時不會呼叫備援來源', async () => {
    const primary = fakeGeocoder([taipei]);
    const secondary = fakeGeocoder([]);

    const geocoder = createFallbackGeocoder(primary, secondary);
    const results = await geocoder.search('台北');

    expect(results).toEqual([taipei]);
    expect(secondary.search).not.toHaveBeenCalled();
  });

  it('主來源查無結果時改用備援來源', async () => {
    const primary = fakeGeocoder([]);
    const secondary = fakeGeocoder([taipei]);

    const geocoder = createFallbackGeocoder(primary, secondary);
    const results = await geocoder.search('台北');

    expect(results).toEqual([taipei]);
    expect(secondary.search).toHaveBeenCalledWith('台北', expect.anything());
  });

  it('主來源發生錯誤時直接往上拋，不會呼叫備援來源', async () => {
    const primary = fakeGeocoder(new Error('boom'));
    const secondary = fakeGeocoder([taipei]);

    const geocoder = createFallbackGeocoder(primary, secondary);

    await expect(geocoder.search('台北')).rejects.toThrow('boom');
    expect(secondary.search).not.toHaveBeenCalled();
  });

  it('關閉備援後只會呼叫主來源', async () => {
    const primary = fakeGeocoder([]);
    const secondary = fakeGeocoder([taipei]);

    const geocoder = createFallbackGeocoder(primary, secondary, { enabled: false });
    const results = await geocoder.search('台北');

    expect(results).toEqual([]);
    expect(secondary.search).not.toHaveBeenCalled();
  });
});
