/**
 * WMO 天氣代碼（WMO code）對照表。
 *
 * Open-Meteo（以及多數氣象 API）使用 WMO 4677 定義的天氣代碼。
 * 把這份對照表集中在 utils，UI 元件只要呼叫 `describeWeather(code)`，
 * 就不需要到處 switch/case，也方便日後做多語系化。
 *
 * 參考：https://open-meteo.com/en/docs
 */
export type WeatherIconKey =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezing'
  | 'snow'
  | 'showers'
  | 'thunderstorm'
  | 'hail';

/** 天氣氛圍色調，用來決定背景漸層與卡片配色。 */
export type WeatherTone = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' | 'neutral';

export interface WeatherDescription {
  code: number;
  /** 中文描述，例如「多雲時晴」。 */
  label: string;
  icon: WeatherIconKey;
  tone: WeatherTone;
}

type DescriptionShape = Omit<WeatherDescription, 'code'>;

const WEATHER_CODES: Record<number, DescriptionShape> = {
  0: { label: '晴朗', icon: 'clear', tone: 'sunny' },
  1: { label: '大致晴朗', icon: 'mostly-clear', tone: 'sunny' },
  2: { label: '局部多雲', icon: 'partly-cloudy', tone: 'cloudy' },
  3: { label: '陰天', icon: 'overcast', tone: 'cloudy' },
  45: { label: '有霧', icon: 'fog', tone: 'cloudy' },
  48: { label: '霧淞', icon: 'fog', tone: 'cloudy' },
  51: { label: '毛毛雨', icon: 'drizzle', tone: 'rainy' },
  53: { label: '毛毛雨', icon: 'drizzle', tone: 'rainy' },
  55: { label: '密集毛毛雨', icon: 'drizzle', tone: 'rainy' },
  56: { label: '凍雨', icon: 'freezing', tone: 'rainy' },
  57: { label: '凍雨', icon: 'freezing', tone: 'rainy' },
  61: { label: '小雨', icon: 'rain', tone: 'rainy' },
  63: { label: '中雨', icon: 'rain', tone: 'rainy' },
  65: { label: '大雨', icon: 'rain', tone: 'rainy' },
  66: { label: '凍雨', icon: 'freezing', tone: 'rainy' },
  67: { label: '凍雨', icon: 'freezing', tone: 'rainy' },
  71: { label: '小雪', icon: 'snow', tone: 'snowy' },
  73: { label: '中雪', icon: 'snow', tone: 'snowy' },
  75: { label: '大雪', icon: 'snow', tone: 'snowy' },
  77: { label: '米雪', icon: 'snow', tone: 'snowy' },
  80: { label: '陣雨', icon: 'showers', tone: 'rainy' },
  81: { label: '強陣雨', icon: 'showers', tone: 'rainy' },
  82: { label: '暴雨', icon: 'showers', tone: 'rainy' },
  85: { label: '陣雪', icon: 'snow', tone: 'snowy' },
  86: { label: '強陣雪', icon: 'snow', tone: 'snowy' },
  95: { label: '雷雨', icon: 'thunderstorm', tone: 'stormy' },
  96: { label: '雷雨夾冰雹', icon: 'hail', tone: 'stormy' },
  99: { label: '強雷雨夾冰雹', icon: 'hail', tone: 'stormy' },
};

const FALLBACK: DescriptionShape = {
  label: '未知天況',
  icon: 'overcast',
  tone: 'cloudy',
};

/** 把 WMO 代碼轉成可顯示的描述、圖示與色調。 */
export function describeWeather(code: number): WeatherDescription {
  const match = WEATHER_CODES[code] ?? FALLBACK;
  return { code, ...match };
}

/** 只取文字描述。 */
export function weatherLabel(code: number): string {
  return describeWeather(code).label;
}
