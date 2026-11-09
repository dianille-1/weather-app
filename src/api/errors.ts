/**
 * 應用程式層級的錯誤型別。
 *
 * 設計重點：把「網路層」的各種失敗（逾時、離線、404、429、伺服器錯誤…）
 * 正規化成少數幾種「使用者看得懂」的語意，讓 UI 可以用 `error.kind`
 * 決定要顯示什麼訊息，而不用到處 `instanceof` 判斷各種原生錯誤。
 */
export type AppErrorKind =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'notFound'
  | 'rateLimited'
  | 'server'
  | 'parse'
  | 'unknown';

export interface AppErrorOptions {
  /** 對應的 HTTP 狀態碼（若有的話）。 */
  status?: number;
  /** 原始錯誤，用於 debug。 */
  cause?: unknown;
}

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly status: number | undefined;

  constructor(kind: AppErrorKind, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.kind = kind;
    this.status = options.status;
  }

  /** 把任何未知錯誤轉成 AppError。 */
  static from(error: unknown): AppError {
    if (error instanceof AppError) return error;
    if (isAbortError(error)) {
      return new AppError('aborted', '請求已取消。', { cause: error });
    }
    if (error instanceof TypeError) {
      // fetch 在離線、DNS 失敗、CORS 被擋時都會拋 TypeError。
      return new AppError('network', '無法連線至天氣服務，請檢查網路連線後再試。', {
        cause: error,
      });
    }
    if (error instanceof Error) {
      return new AppError('unknown', error.message, { cause: error });
    }
    return new AppError('unknown', '發生未預期的錯誤，請稍後再試。', { cause: error });
  }
}

/** 判斷是否為 AbortError（fetch 中止）。 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}

/** 依錯誤種類給使用者看的預設訊息。 */
export const ERROR_MESSAGES: Record<AppErrorKind, string> = {
  network: '無法連線至天氣服務，請檢查網路連線後再試。',
  timeout: '連線逾時，請稍後再試。',
  aborted: '請求已取消。',
  notFound: '找不到相符的地點，請試試其他關鍵字。',
  rateLimited: '查詢過於頻繁，請稍後再試。',
  server: '天氣服務暫時無法使用，請稍後再試。',
  parse: '天氣服務回傳的資料格式無法解析。',
  unknown: '發生未預期的錯誤，請稍後再試。',
};
