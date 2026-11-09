import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAsyncResource } from './useAsyncResource';

describe('useAsyncResource', () => {
  it('只採用最後一次請求的結果（避免競態覆蓋）', async () => {
    const resolvers: Record<string, (value: string) => void> = {};
    const task = vi.fn(
      (_signal: AbortSignal, term: string) =>
        new Promise<string>((resolve) => {
          resolvers[term] = resolve;
        }),
    );

    const { result } = renderHook(() => useAsyncResource(task));

    act(() => {
      void result.current.run('first');
    });
    act(() => {
      void result.current.run('second');
    });

    // 先後回應，模擬「舊請求較晚回來」的情況。
    await act(async () => {
      resolvers['second']?.('second-result');
    });
    await act(async () => {
      resolvers['first']?.('first-result');
    });

    expect(result.current.state.status).toBe('success');
    expect(result.current.state.data).toBe('second-result');
  });

  it('取消中的請求不會觸發錯誤狀態', async () => {
    const task = vi.fn(
      (_signal: AbortSignal, _term: string) =>
        new Promise<string>((_resolve, reject) => {
          // 模擬 AbortError
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }),
    );

    const { result } = renderHook(() => useAsyncResource(task));

    await act(async () => {
      void result.current.run('term');
    });

    expect(result.current.state.status).toBe('idle');
    expect(result.current.state.error).toBeNull();
  });

  it('失敗時會把錯誤正規化成 AppError 並保留錯誤狀態', async () => {
    const task = vi.fn(async (_signal: AbortSignal, _term: string) => {
      throw new TypeError('Failed to fetch');
    });

    const { result } = renderHook(() => useAsyncResource(task));

    await act(async () => {
      void result.current.run('term');
    });

    expect(result.current.state.status).toBe('error');
    expect(result.current.state.error?.kind).toBe('network');
  });
});
