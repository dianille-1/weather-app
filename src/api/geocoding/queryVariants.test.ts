// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildQueryVariants, containsHan } from './queryVariants';

describe('查詢字串變體', () => {
  it('非中文查詢只產生原字串', () => {
    expect(buildQueryVariants('London')).toEqual(['London']);
  });

  it('中文查詢會產生加「市」與「台→臺」的變體', () => {
    expect(buildQueryVariants('台中')).toEqual(['台中', '台中市', '臺中', '臺中市']);
  });

  it('「臺」開頭的查詢不會產生重複變體', () => {
    expect(buildQueryVariants('臺北')).toEqual(['臺北', '臺北市']);
  });

  it('會去除前後空白', () => {
    expect(buildQueryVariants('  台北  ')[0]).toBe('台北');
  });

  it('空白查詢不會產生變體', () => {
    expect(buildQueryVariants('   ')).toEqual([]);
  });

  it('變體數量上限會被套用', () => {
    expect(buildQueryVariants('台中', 2)).toEqual(['台中', '台中市']);
  });

  it('可以判斷是否含有漢字', () => {
    expect(containsHan('台中')).toBe(true);
    expect(containsHan('Taichung')).toBe(false);
    expect(containsHan('台北101')).toBe(true);
  });
});
