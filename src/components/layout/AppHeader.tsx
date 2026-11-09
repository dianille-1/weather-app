import { NavLink, useLocation } from 'react-router-dom';
import { usePreferences } from '../../app/preferences';
import { UnitToggle } from '../common/UnitToggle';
import styles from './AppHeader.module.css';

/**
 * 頁首：品牌、頁面導覽、單位切換。
 *
 * 導覽使用 NavLink：目前所在頁面的樣式由 router 決定，
 * 不需要自己追蹤「現在在哪一頁」的狀態。
 *
 * 導覽時刻意保留查詢參數（?lat=..&lon=..）：
 *   「目前選取的城市」是網址列上的狀態，若換頁時把它丟掉，
 *   使用者從設定頁回到天氣頁就會看到空白畫面。
 *   保留參數等於讓「網址列是狀態的唯一真實來源」這件事在換頁後依然成立。
 */
export function AppHeader() {
  const { units, toggleTemperatureUnit } = usePreferences();
  const { search } = useLocation();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <circle cx="13" cy="12" r="5" fill="currentColor" />
            <path
              d="M9.6 23.4h12.1a4.2 4.2 0 0 0 .5-8.37A6.3 6.3 0 0 0 10.2 12.7 4.7 4.7 0 0 0 9.6 23.4Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <div>
          <h1 className={styles.title}>天氣 App</h1>
          <p className={styles.subtitle}>即時天氣與未來一週預報</p>
        </div>
      </div>

      <nav className={styles.nav} aria-label="主要導覽">
        <NavLink
          to={{ pathname: '/', search }}
          end
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.linkActive}` : styles.link
          }
        >
          天氣
        </NavLink>
        <NavLink
          to={{ pathname: '/settings', search }}
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.linkActive}` : styles.link
          }
        >
          設定
        </NavLink>
      </nav>

      <UnitToggle units={units} onChange={() => toggleTemperatureUnit()} />
    </header>
  );
}
