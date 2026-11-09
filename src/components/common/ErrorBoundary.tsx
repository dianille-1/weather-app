import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** 自訂的錯誤畫面（未提供時使用預設樣式）。 */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 全域錯誤邊界。
 *
 * 為什麼需要它？
 *   React 的錯誤處理是「往下」的：沒有邊界的話，元件在 render 中拋出的例外
 *   會讓整棵樹 unmount，使用者只會看到一片空白，連「發生什麼事」都不知道。
 *   加了邊界之後，最壞的情況是畫面中央出現一段可讀的訊息，並提供重試按鈕。
 *
 * 注意：錯誤邊界只處理「render / lifecycle」階段的例外，
 *       資料抓取失敗是另外一套機制（api/errors.ts 的 AppError）。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 除錯用的資訊；正式環境可以再接到 Sentry 這類的監控服務。
    console.error('[weather] 未預期的錯誤：', error, info.componentStack);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div className={styles.fallback} role="alert">
        <h1 className={styles.title}>發生錯誤</h1>
        <p className={styles.message}>{error.message || '發生未預期的錯誤，請稍後再試。'}</p>
        <button type="button" className={styles.retry} onClick={this.reset}>
          重新載入
        </button>
      </div>
    );
  }
}
