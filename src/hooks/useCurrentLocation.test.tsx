import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurrentLocation } from './useCurrentLocation';
import type { ReverseGeocoder } from '../api/geocoding/reverseGeocoder';
import type { Location } from '../types/location';

const taipei: Location = {
  id: 'osm-relation-1293250',
  name: '臺北市',
  adminArea: '臺灣省',
  country: '臺灣',
  countryCode: 'TW',
  latitude: 25.033,
  longitude: 121.565,
  timezone: null,
};

type PositionCallback = (position: {
  coords: { latitude: number; longitude: number };
}) => void;
type ErrorCallback = (error: { code: number; message: string }) => void;

/** 取代瀏覽器的 Geolocation API（jsdom 沒有實作）。 */
function stubGeolocation(impl: (success: PositionCallback, error: ErrorCallback) => void) {
  const getCurrentPosition = vi.fn((success: PositionCallback, error: ErrorCallback) => {
    impl(success, error);
  });
  Object.defineProperty(navigator, 'geolocation', {
    value: { getCurrentPosition },
    configurable: true,
    writable: true,
  });
  return getCurrentPosition;
}

function removeGeolocation() {
  Object.defineProperty(navigator, 'geolocation', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

function fakeReverseGeocoder(result: Location | null | Error): ReverseGeocoder {
  return {
    id: 'fake',
    reverse: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

describe('useCurrentLocation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('定位成功後會反查地名', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 25.033, longitude: 121.565 } }),
    );
    const reverseGeocoder = fakeReverseGeocoder(taipei);

    const { result } = renderHook(() => useCurrentLocation(true, reverseGeocoder));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.location?.name).toBe('臺北市');
    expect(reverseGeocoder.reverse).toHaveBeenCalledWith(25.033, 121.565);
  });

  it('反查失敗時退回只有座標的地點，不讓整個流程失敗', async () => {
    stubGeolocation((success) =>
      success({ coords: { latitude: 25.033, longitude: 121.565 } }),
    );
    const reverseGeocoder = fakeReverseGeocoder(new Error('network down'));

    const { result } = renderHook(() => useCurrentLocation(true, reverseGeocoder));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.location?.name).toBe('目前位置');
    expect(result.current.location?.latitude).toBe(25.033);
  });

  it('權限被拒絕時回報可讀的錯誤', async () => {
    stubGeolocation((_success, error) => error({ code: 1, message: 'denied' }));
    const reverseGeocoder = fakeReverseGeocoder(taipei);

    const { result } = renderHook(() => useCurrentLocation(true, reverseGeocoder));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.kind).toBe('permissionDenied');
    expect(result.current.location).toBeNull();
  });

  it('瀏覽器不支援定位時回報 unsupported', async () => {
    removeGeolocation();
    const reverseGeocoder = fakeReverseGeocoder(taipei);

    const { result } = renderHook(() => useCurrentLocation(true, reverseGeocoder));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.kind).toBe('unsupported');
  });

  it('未啟用時不會要求定位', async () => {
    const getCurrentPosition = stubGeolocation((success) =>
      success({ coords: { latitude: 25.033, longitude: 121.565 } }),
    );
    const reverseGeocoder = fakeReverseGeocoder(taipei);

    const { result } = renderHook(() => useCurrentLocation(false, reverseGeocoder));

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });
});
