import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { TemperatureUnit, Units, WindSpeedUnit } from '../types/weather';

const STORAGE_KEY = 'weather-app:units';

export const DEFAULT_UNITS: Units = {
  temperature: 'celsius',
  windSpeed: 'kmh',
};

/**
 * 使用者偏好的單位（溫度 / 風速），並持久化到 localStorage。
 *
 * 溫度單位切換時風速單位「跟著切」（°C ↔ km/h、°F ↔ mph），
 * 因為這是同一個「公制 / 英制」偏好，綁在一起符合直覺。
 */
export function useUnits(): [Units, (next: Units) => void] {
  const [units, setUnits] = useLocalStorage<Units>(STORAGE_KEY, DEFAULT_UNITS, {
    revive: reviveUnits,
  });

  const updateUnits = useCallback(
    (next: Units) => setUnits(next),
    [setUnits],
  );

  return [units, updateUnits];
}

/** 在攝氏 / 華氏之間切換（同步切換風速單位）。 */
export function toggleTemperatureUnit(units: Units): Units {
  const nextTemperature: TemperatureUnit =
    units.temperature === 'celsius' ? 'fahrenheit' : 'celsius';
  const nextWindSpeed: WindSpeedUnit = nextTemperature === 'celsius' ? 'kmh' : 'mph';
  return { temperature: nextTemperature, windSpeed: nextWindSpeed };
}

function reviveUnits(raw: unknown): Units | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<Units>;
  const temperature = candidate.temperature === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  const windSpeed =
    temperature === 'fahrenheit'
      ? candidate.windSpeed === 'kmh'
        ? 'kmh'
        : 'mph'
      : candidate.windSpeed === 'mph'
        ? 'mph'
        : 'kmh';
  return { temperature, windSpeed };
}
