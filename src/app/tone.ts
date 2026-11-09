import { createContext, useContext, useEffect } from 'react';
import type { WeatherTone } from '../utils/weatherCodes';

/**
 * 介面色調的 context 定義。
 *
 * 背景色會隨目前天況變化（晴 → 暖黃、雨 → 冷藍…），但色調是「天氣頁算得出來的」、
 * 「外框要拿來畫背景的」—— 這是典型需要跨樹傳遞的狀態。
 *
 * 為什麼用 context 而不是狀態管理套件？
 *   因為它只有一個值、只有一個寫入者（天氣頁）、只有一個讀取者（外框）。
 *   為它引入一個外部 store 是不划算的；一個 30 行的 context 就夠了。
 */
export interface ToneContextValue {
  tone: WeatherTone;
  setTone: (tone: WeatherTone) => void;
}

export const ToneContext = createContext<ToneContextValue | null>(null);

export function useTone(): ToneContextValue {
  const value = useContext(ToneContext);
  if (!value) {
    throw new Error('useTone 必須在 <ToneProvider> 內使用。');
  }
  return value;
}

/**
 * 由頁面回報目前的色調。
 *
 * 用 hook 的形式呼叫，讓「回報」這件事在呼叫端看起來就是一個普通的 hook，
 * 而不需要在頁面裡放 useEffect 再手動維護 context。
 */
export function useReportTone(tone: WeatherTone): void {
  const { setTone } = useTone();

  useEffect(() => {
    setTone(tone);
  }, [tone, setTone]);

  // 離開頁面時還原成預設色調，避免上一頁的顏色留到下一頁。
  useEffect(() => () => setTone('neutral'), [setTone]);
}
