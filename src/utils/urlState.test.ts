// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildLocationSearch, parseLocationFromSearch } from './urlState';
import type { Location } from '../types/location';

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

describe('網址列狀態', () => {
  it('可以把地點編碼成查詢參數', () => {
    const params = buildLocationSearch(taipei);

    expect(params.get('lat')).toBe('25.0531');
    expect(params.get('lon')).toBe('121.5264');
    expect(params.get('name')).toBe('臺北市');
    expect(params.get('region')).toBe('臺灣省');
    expect(params.get('country')).toBe('台灣');
    expect(params.get('cc')).toBe('TW');
  });

  it('編碼後可以還原成同一個地點', () => {
    const restored = parseLocationFromSearch(buildLocationSearch(taipei));

    expect(restored).toMatchObject({
      name: '臺北市',
      adminArea: '臺灣省',
      country: '台灣',
      countryCode: 'TW',
    });
    expect(restored?.latitude).toBeCloseTo(taipei.latitude, 4);
    expect(restored?.longitude).toBeCloseTo(taipei.longitude, 4);
  });

  it('沒有座標時回傳 null', () => {
    expect(parseLocationFromSearch(new URLSearchParams())).toBeNull();
    expect(parseLocationFromSearch(new URLSearchParams('lat=abc&lon=121'))).toBeNull();
  });

  it('缺少顯示用欄位時會填入 null 而非拋錯', () => {
    const restored = parseLocationFromSearch(new URLSearchParams('lat=25.05&lon=121.52'));

    expect(restored?.name).toBe('目前位置');
    expect(restored?.adminArea).toBeNull();
    expect(restored?.country).toBeNull();
  });
});
