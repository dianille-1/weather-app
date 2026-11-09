import type { AppError } from '../api/errors';
import styles from './ErrorNotice.module.css';

interface Props {
  error: AppError;
  /** 傳入則顯示「重試」按鈕。 */
  onRetry?: () => void;
  title?: string;
}

/**
 * 錯誤提示。
 *
 * 使用 role="alert" 讓螢幕閱讀器立即朗讀錯誤內容，
 * 並保留技術細節（HTTP status）方便除錯，但以較弱的視覺呈現。
 */
export function ErrorNotice({ error, onRetry, title = '發生錯誤' }: Props) {
  return (
    <div className={styles.notice} role="alert">
      <span className={styles.icon} aria-hidden="true">
        !
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{error.message}</p>
        {error.status !== undefined ? (
          <p className={styles.meta}>HTTP {error.status}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          重試
        </button>
      ) : null}
    </div>
  );
}
