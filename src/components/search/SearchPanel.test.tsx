import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Geocoder } from '../../api/geocoding/geocoder';
import type { Location } from '../../types/location';
import { SearchPanel } from './SearchPanel';

const taipei: Location = {
  id: 'geo-1668341',
  name: '臺北市',
  adminArea: '臺灣省',
  country: '台灣',
  countryCode: 'TW',
  latitude: 25.05306,
  longitude: 121.52639,
  timezone: 'Asia/Taipei',
};

function createFakeGeocoder(): Geocoder {
  return {
    id: 'fake',
    displayName: 'Fake geocoder',
    search: vi.fn(async () => [taipei]),
  };
}

describe('SearchPanel', () => {
  it('搜尋並選取地點時會呼叫 onSelect', async () => {
    const onSelect = vi.fn();
    const geocoder = createFakeGeocoder();
    const user = userEvent.setup();

    render(<SearchPanel geocoder={geocoder} onSelect={onSelect} />);

    await user.type(screen.getByRole('combobox'), '台北');

    const option = await screen.findByRole('option', { name: /臺北市/ }, { timeout: 3000 });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith(taipei);
  });

  it('輸入字數不足時不會送出查詢', async () => {
    const geocoder = createFakeGeocoder();
    const user = userEvent.setup();

    render(<SearchPanel geocoder={geocoder} onSelect={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), '台');

    await waitFor(() => {
      expect(screen.getByText(/請輸入至少 2 個字元/)).toBeInTheDocument();
    });
    expect(geocoder.search).not.toHaveBeenCalled();
  });

  it('查詢失敗時顯示錯誤訊息與重試按鈕', async () => {
    const geocoder = createFakeGeocoder();
    geocoder.search = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    });
    const user = userEvent.setup();

    render(<SearchPanel geocoder={geocoder} onSelect={vi.fn()} />);

    await user.type(screen.getByRole('combobox'), '台北');

    const alert = await screen.findByRole('alert', {}, { timeout: 3000 });
    expect(alert).toHaveTextContent(/無法連線/);
    expect(screen.getByRole('button', { name: '重試' })).toBeInTheDocument();
  });
});
