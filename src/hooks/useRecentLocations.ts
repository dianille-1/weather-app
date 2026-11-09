import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Location } from '../types/location';

const STORAGE_KEY = 'weather-app:recent-locations';
const MAX_ITEMS = 5;

export interface RecentLocations {
  locations: Location[];
  /** 新增／移到最前面（同一地點不重複）。 */
  add: (location: Location) => void;
  remove: (id: string) => void;
  clear: () => void;
}

/** 最近瀏覽的地點（持久化在 localStorage，最多 5 筆）。 */
export function useRecentLocations(): RecentLocations {
  const [locations, setLocations] = useLocalStorage<Location[]>(STORAGE_KEY, [], {
    revive: reviveLocations,
  });

  const add = useCallback(
    (location: Location) => {
      setLocations((previous) => [
        location,
        ...previous.filter((item) => item.id !== location.id),
      ].slice(0, MAX_ITEMS));
    },
    [setLocations],
  );

  const remove = useCallback(
    (id: string) => {
      setLocations((previous) => previous.filter((item) => item.id !== id));
    },
    [setLocations],
  );

  const clear = useCallback(() => setLocations([]), [setLocations]);

  return { locations, add, remove, clear };
}

function reviveLocations(raw: unknown): Location[] | null {
  if (!Array.isArray(raw)) return null;
  const valid = raw.filter(isLocation);
  return valid.slice(0, MAX_ITEMS);
}

function isLocation(value: unknown): value is Location {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Location>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number'
  );
}
