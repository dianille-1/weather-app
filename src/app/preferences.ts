import { createContext, useContext } from 'react';
import type { Location } from '../types/location';
import type { Units } from '../types/weather';

/**
 * 使用者偏好的 context 定義。
 *
 * 為什麼 context 與 Provider 分成兩個檔案？
 *   React Fast Refresh 要求「一個檔案只匯出元件」，才會在熱更新時保留元件狀態。
 *   如果 Provider 與 usePreferences hook 放在同一個 .tsx，熱更新會退化成整頁重載。
 *   因此：context 與 hook 放在 .ts，Provider 放在 providers.tsx。
 *
 * 哪些東西算「偏好」？
 *   - 溫度 / 風速單位偏好（持久化）
 *   - 最近瀏覽的地點（持久化）
 *
 * 這兩項在多個頁面都會用到（外框的單位切換、天氣頁的側欄、設定頁的管理清單），
 * 而且都需要在「頁面之間切換後保持一致」。
 * 若各頁面各自呼叫 useLocalStorage，會各自持有一份 state，
 * 在設定頁刪掉一筆最近瀏覽、天氣頁不會立刻更新 —— 所以統一由這裡提供。
 *
 * 其餘狀態（搜尋關鍵字、天氣資料、載入狀態…）仍然留在各頁面的 hook 裡，沒有往上提升。
 */
export interface Preferences {
  units: Units;
  setUnits: (units: Units) => void;
  /** 在 °C / °F 之間切換（風速單位會一併切換）。 */
  toggleTemperatureUnit: () => void;
  recentLocations: Location[];
  addRecentLocation: (location: Location) => void;
  removeRecentLocation: (id: string) => void;
  clearRecentLocations: () => void;
}

export const PreferencesContext = createContext<Preferences | null>(null);

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error('usePreferences 必須在 <PreferencesProvider> 內使用。');
  }
  return value;
}
