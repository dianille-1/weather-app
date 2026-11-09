import { AppError } from './errors';

/**
 * 極簡的 fetch 包裝層。
 *
 * 這一層負責所有「與 HTTP 有关的共通麻煩事」，讓上層的 provider 只專注於
 * 呼叫 API 與轉換資料：
 *   - 逾時控制（避免請求永遠掛著）
 *   - 外部 AbortSignal 與內部 timeout 的整合
 *   - HTTP 狀態碼 → AppError 的正規化
 *   - JSON 解析失敗 → AppError('parse')
 */
export interface JsonRequestOptions {
  /** 呼叫端可主動取消（用來處理搜尋時的競態問題）。 */
  signal?: AbortSignal;
  /** 逾時時間（毫秒），預設 10 秒。 */
  timeoutMs?: number;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function getJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, headers } = options;

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) {
    clearTimeout(timeoutId);
    throw new AppError('aborted', '請求已取消。');
  }
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await toHttpError(response);
    }

    const text = await response.text();
    if (!text.trim()) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new AppError('parse', '天氣服務回傳的資料格式無法解析。', { cause });
    }
  } catch (error) {
    // 順序很重要：先看是不是使用者主動取消，再看是不是我們自己逾時。
    if (signal?.aborted) {
      throw new AppError('aborted', '請求已取消。', { cause: error });
    }
    if (timedOut) {
      throw new AppError('timeout', '連線逾時，請稍後再試。', { cause: error });
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw AppError.from(error);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

async function toHttpError(response: Response): Promise<AppError> {
  const { status } = response;
  if (status === 404) {
    return new AppError('notFound', '找不到相符的地點，請試試其他關鍵字。', { status });
  }
  if (status === 429) {
    return new AppError('rateLimited', '查詢過於頻繁，請稍後再試。', { status });
  }
  if (status >= 500) {
    return new AppError('server', '天氣服務暫時無法使用，請稍後再試。', { status });
  }
  return new AppError('unknown', `查詢失敗（HTTP ${status}）。`, { status });
}
