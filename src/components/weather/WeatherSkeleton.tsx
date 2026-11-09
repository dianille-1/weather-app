import styles from './WeatherSkeleton.module.css';

/** 載入中的版面預留（skeleton），避免載入時畫面突然跳動。 */
export function WeatherSkeleton() {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <div className={styles.card}>
        <div className={styles.lineWide} />
        <div className={styles.line} />
        <div className={styles.block} />
        <div className={styles.metrics}>
          <div className={styles.metric} />
          <div className={styles.metric} />
          <div className={styles.metric} />
          <div className={styles.metric} />
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.list}>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={styles.row} />
          ))}
        </div>
      </div>
    </div>
  );
}
