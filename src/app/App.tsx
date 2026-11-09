import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { AppProviders } from './providers';
import { AppRoutes } from './router';

/**
 * App 根元件：只負責「組裝」。
 *
 * 這裡刻意不放任何頁面內容 ——
 *   頁面      → pages/
 *   路由      → app/router.tsx
 *   版面      → components/layout/
 *   業務邏輯  → hooks/ + api/
 *
 * App 只回答兩個問題：「要用哪些 Provider 包起來？」與「有哪些路由？」
 * 未來新增頁面時，這個檔案通常不需要動 —— 那是 router.tsx 的工作。
 */
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
