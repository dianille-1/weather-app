import { Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SettingsPage } from '../pages/SettingsPage';
import { WeatherPage } from '../pages/WeatherPage';

/**
 * 路由表。
 *
 * 新增一個頁面只需要兩步：
 *   1. 在 pages/ 底下寫一個元件
 *   2. 在這裡加一條 <Route>
 *
 * App.tsx、AppShell 與其他頁面都不需要修改 —— 這就是把頁面從 App 拆出來的目的。
 *
 * 路徑與查詢參數的分工：
 *   - 路徑（path）代表「是哪一個頁面」：/、/settings
 *   - 查詢參數（?lat=..&lon=..）代表「這個頁面的狀態」：目前選取的城市
 * 這樣新增頁面時不必重新發明狀態的編碼方式。
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WeatherPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
