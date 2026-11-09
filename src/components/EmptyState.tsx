import styles from './EmptyState.module.css';

/** 尚未選擇地點時的初始畫面。 */
export function EmptyState() {
  return (
    <section className={styles.empty} aria-label="開始使用">
      <div className={styles.icon} aria-hidden="true">
        <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="14" r="5.4" fill="currentColor" opacity="0.85" />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="16" y1="3.6" x2="16" y2="6.6" />
            <line x1="16" y1="21.4" x2="16" y2="24.4" />
            <line x1="5.6" y1="14" x2="8.6" y2="14" />
            <line x1="23.4" y1="14" x2="26.4" y2="14" />
          </g>
          <path
            d="M9.6 23.4h12.1a4.2 4.2 0 0 0 .5-8.37A6.3 6.3 0 0 0 10.2 12.7 4.7 4.7 0 0 0 9.6 23.4Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <h2 className={styles.title}>搜尋一個城市開始</h2>
      <p className={styles.text}>
        在左側輸入城市名稱，即可查看目前天氣狀況、體感溫度與未來一週的預報。
      </p>
    </section>
  );
}
