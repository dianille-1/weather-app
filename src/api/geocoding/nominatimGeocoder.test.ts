// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNominatimClient } from './nominatimGeocoder';

const taipeiPayload = [
  {
    place_id: 231650780,
    osm_type: 'relation',
    osm_id: 1293250,
    lat: '25.0375198',
    lon: '121.5636796',
    category: 'boundary',
    type: 'administrative',
    addresstype: 'city',
    name: '臺北市',
    display_name: '臺北市, 臺灣',
    address: {
      city: '臺北市',
      'ISO3166-2-lvl4': 'TW-TPE',
      country: '臺灣',
      country_code: 'tw',
    },
  },
];

/** 反查回應：Nominatim 會回傳「最近的物件」（這裡是一棟辦公大樓）。 */
const reversePayload = {
  place_id: 998877,
  osm_type: 'node',
  osm_id: 123456,
  lat: '25.0335672',
  lon: '121.5649304',
  category: 'office',
  type: 'company',
  addresstype: 'office',
  name: '台灣野村',
  display_name: '台灣野村, 7, 松智路, 臺北市, 臺灣',
  address: {
    office: '台灣野村',
    road: '松智路',
    suburb: '信義區',
    city: '臺北市',
    country: '臺灣',
    country_code: 'tw',
  },
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

describe('Nominatim 地理編碼', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('把城市結果轉換成領域模型', async () => {
    mockJson(taipeiPayload);
    const client = createNominatimClient();

    const [location] = await client.search('台北');

    expect(location).toMatchObject({
      id: 'osm-relation-1293250',
      name: '臺北市',
      country: '臺灣',
      countryCode: 'TW',
    });
    expect(location?.latitude).toBeCloseTo(25.0375, 4);
    expect(location?.longitude).toBeCloseTo(121.5637, 4);
  });

  it('行政區會從 display_name 補齊', async () => {
    mockJson([
      {
        place_id: 1,
        osm_type: 'relation',
        osm_id: 2,
        lat: '39.8',
        lon: '-89.6',
        addresstype: 'city',
        name: 'Springfield',
        display_name: 'Springfield, Illinois, United States',
        address: { country: 'United States', country_code: 'us' },
      },
    ]);
    const client = createNominatimClient();

    const [location] = await client.search('Springfield');

    expect(location?.adminArea).toBe('Illinois');
    expect(location?.country).toBe('United States');
  });

  it('過濾掉街道、門牌等非聚落層級的結果', async () => {
    mockJson([
      {
        place_id: 1,
        osm_type: 'way',
        osm_id: 2,
        lat: '25.04',
        lon: '121.5',
        addresstype: 'road',
        name: '忠孝東路',
        display_name: '忠孝東路, 臺北市, 臺灣',
      },
    ]);
    const client = createNominatimClient();

    await expect(client.search('忠孝東路')).resolves.toEqual([]);
  });

  it('座標不合法時丟棄該筆結果', async () => {
    mockJson([
      {
        place_id: 1,
        osm_type: 'relation',
        osm_id: 2,
        lat: 'not-a-number',
        lon: '121.5',
        addresstype: 'city',
        name: '怪地名',
      },
    ]);
    const client = createNominatimClient();

    await expect(client.search('怪地名')).resolves.toEqual([]);
  });

  it('查無結果時回傳空陣列', async () => {
    mockJson([]);
    const client = createNominatimClient();

    await expect(client.search('zzzzqqqxxx')).resolves.toEqual([]);
  });

  describe('反向地理編碼', () => {
    it('由座標找出所在城市，而不是最近的建築物', async () => {
      mockJson(reversePayload);
      const client = createNominatimClient();

      const location = await client.reverse(25.033, 121.565);

      expect(location).toMatchObject({
        name: '臺北市',
        country: '臺灣',
        countryCode: 'TW',
      });
    });

    it('使用輸入的座標，而不是反查物件的座標', async () => {
      mockJson(reversePayload);
      const client = createNominatimClient();

      const location = await client.reverse(25.033, 121.565);

      expect(location?.latitude).toBe(25.033);
      expect(location?.longitude).toBe(121.565);
    });

    it('多語系並列的國名只取主要名稱', async () => {
      mockJson({
        ...reversePayload,
        address: {
          ...reversePayload.address,
          country: '美国;美國',
        },
      });
      const client = createNominatimClient();

      const location = await client.reverse(40.71, -74.01);

      expect(location?.country).toBe('美国');
    });

    it('反查不到行政區欄位時回傳 null', async () => {
      mockJson({ ...reversePayload, address: { country: '臺灣' } });
      const client = createNominatimClient();

      await expect(client.reverse(25.03, 121.56)).resolves.toBeNull();
    });
  });
});
