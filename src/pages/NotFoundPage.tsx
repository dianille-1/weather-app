import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

/**
 * 找不到對應頁面時顯示（路由 `*`）。
 *
 * 放在 AppShell 外層是刻意的：404 頁有自己的排版（置中），
 * 不需要共用頁首頁尾的版面。
 */
export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>找不到這個頁面</h1>
      <p className={styles.text}>這個網址可能已經變更或不存在。</p>
      <Link to="/" className={styles.link}>
        回到天氣頁
      </Link>
    </div>
  );
}
