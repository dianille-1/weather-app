import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppProviders } from './providers';
import { AppRoutes } from './router';

/**
 * 路由的煙霧測試。
 *
 * 重點不是測 React Router 本身，而是確認「新增頁面時只要加一條 Route」
 * 這個假設真的成立：頁面能各自渲染、版面外框正確包覆、未知路徑有 fallback。
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  );
}

describe('路由', () => {
  it('根路徑顯示天氣頁', () => {
    renderAt('/');

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '搜尋一個城市開始' })).toBeInTheDocument();
  });

  it('/settings 顯示設定頁，且不包含天氣頁的搜尋框', () => {
    renderAt('/settings');

    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('所有頁面都共用同一個版面外框（頁首與頁尾）', () => {
    renderAt('/settings');

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主要導覽' })).toBeInTheDocument();
  });

  it('未知路徑顯示 404 頁', () => {
    renderAt('/does-not-exist');

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '回到天氣頁' })).toBeInTheDocument();
  });
});
