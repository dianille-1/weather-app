/**
 * 地名查詢的字串變體。
 *
 * 背景：兩個地名來源的索引都不完整，而且「同一個城市」在不同來源裡
 * 的寫法不一致（台 / 臺、臺北市 / 台北市、桃園 / 桃園市…）。
 * 實測結果：
 *
 *   查詢    Open-Meteo(zh)    Nominatim
 *   台北    查無              臺北市 ✓
 *   台中    查無              查無（但「台中市」✓）
 *   桃園    查無              查無（但「桃園市」✓）
 *   高雄    高雄 ✓            查無（但「高雄市」✓）
 *   臺中    查無（「臺中市」✓）  查無（「臺中市」✓）
 *
 * 也就是說，只要把「台 / 臺」與「有沒有『市』」這兩種寫法都試過，
 * 就能涵蓋絕大多數台灣縣市名。
 *
 * 這裡刻意只做「加『市』」與「台 ↔ 臺」兩種最保守的變化：
 *   - 不做完整的簡繁轉換（需要一份字典，對這個需求太重）
 *   - 不做拼音轉換（同上）
 * 這兩種寫法是台灣地名最主要的分歧來源，命中率卻很高。
 */

/** 是否含有中文（漢字）。只有中文查詢才需要產生變體。 */
export function containsHan(text: string): boolean {
  return /[㐀-䶿一-鿿豈-﫿]/.test(text);
}

/**
 * 產生查詢變體，由「最可能命中」排到「最不可能」。
 *
 * 索引 0 一定是原字串本身；呼叫端通常會先試原字串，
 * 因此實作時會跳過索引 0（見 expandedGeocoder.ts）。
 */
export function buildQueryVariants(query: string, limit = 4): string[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const variants = new Set<string>([trimmed]);
  if (!containsHan(trimmed)) return [...variants];

  // 「台」→「臺」是臺灣地名最常見的兩種寫法差異。
  const traditional = trimmed.replace(/台/g, '臺');

  variants.add(`${trimmed}市`);
  variants.add(traditional);
  variants.add(`${traditional}市`);

  return [...variants].slice(0, Math.max(1, limit));
}
