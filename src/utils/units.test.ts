import { describe, expect, it } from 'vitest';
import {
  celsiusToFahrenheit,
  convertTemperature,
  convertWindSpeed,
  formatPercentage,
  formatTemperature,
  formatWindSpeed,
  kmhToMph,
} from './units';

describe('units', () => {
  it('攝氏與華氏換算正確', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });

  it('依使用者選擇的單位換算溫度', () => {
    expect(convertTemperature(25, 'celsius')).toBe(25);
    expect(convertTemperature(25, 'fahrenheit')).toBeCloseTo(77, 5);
  });

  it('依使用者選擇的單位換算風速', () => {
    expect(kmhToMph(100)).toBeCloseTo(62.1371, 3);
    expect(convertWindSpeed(10, 'kmh')).toBe(10);
    expect(convertWindSpeed(10, 'mph')).toBeCloseTo(6.21371, 5);
  });

  it('格式化輸出', () => {
    expect(formatTemperature(24.4, 'celsius')).toBe('24°C');
    expect(formatTemperature(75.9, 'fahrenheit')).toBe('76°F');
    expect(formatWindSpeed(14.4, 'kmh')).toBe('14 km/h');
    expect(formatWindSpeed(9.5, 'mph')).toBe('10 mph');
    expect(formatPercentage(72.6)).toBe('73%');
  });
});
