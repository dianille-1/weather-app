import { Outlet } from 'react-router-dom';
import { useTone } from '../../app/tone';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import styles from './AppShell.module.css';

/**
 * 應用程式的版面外框。
 *
 * 這是「版面路由（layout route）」：所有頁面都渲染在 <Outlet /> 之中，
 * 因此頁尾、導覽列、背景色調只需要維護一份。
 *
 * 新增頁面時不需要動這個檔案 —— 只要在 router.tsx 加一條 Route 就會自動
 * 被包進這個外框。
 */
export function AppShell() {
  const { tone } = useTone();

  return (
    <div className={styles.app} data-tone={tone}>
      <AppHeader />
      <main className={styles.main}>
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
