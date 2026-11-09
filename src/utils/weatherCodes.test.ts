import { describe, expect, it } from 'vitest';
import { describeWeather, weatherLabel } from './weatherCodes';

describe('describeWeather', () => {
  it('把常見的 WMO 天氣代碼對應到正確的描述與圖示', () => {
    expect(describeWeather(0)).toMatchObject({
      label: '晴朗',
      icon: 'clear',
      tone: 'sunny',
    });
    expect(describeWeather(2)).toMatchObject({ icon: 'partly-cloudy', tone: 'cloudy' });
    expect(describeWeather(61)).toMatchObject({ label: '小雨', icon: 'rain', tone: 'rainy' });
    expect(describeWeather(71)).toMatchObject({ icon: 'snow', tone: 'snowy' });
    expect(describeWeather(95)).toMatchObject({ icon: 'thunderstorm', tone: 'stormy' });
  });

  it('未知代碼會退回預設描述，而不是拋出例外', () => {
    expect(describeWeather(9999)).toMatchObject({
      label: '未知天況',
      icon: 'overcast',
      tone: 'cloudy',
    });
    expect(describeWeather(-1).label).toBe('未知天況');
  });

  it('weatherLabel 只回傳文字描述', () => {
    expect(weatherLabel(3)).toBe('陰天');
  });
});
