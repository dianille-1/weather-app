import type { ProviderCallOptions } from '../callOptions';
import type { Location } from '../../types/location';

/**
 * 地理編碼（把地名變成座標）的抽象介面。
 *
 * 為什麼把「搜尋地點」從 WeatherProvider 拆成獨立的 port？
 *   - 搜尋與預報來自不同的上游服務，各有所長：
 *       Open-Meteo 免 key、速度快，但它的中文地名索引收錄不完整
 *       （「台北」查不到、「台北市」才有；「台中」「桃園」同樣查不到）；
 *       OSM Nominatim 免 key、中文地名覆蓋好，但有使用條款與限流。
 *   - 兩者的失敗模式與使用政策都不同，硬綁在同一個 provider 裡會互相牽絆：
 *     換掉搜尋來源不應該動到預報， vice versa。
 *
 * 因此上層（hooks / 元件）只認得「把字串變成 Location 列表」這件事，
 * 具體來源由 api/index.ts 的工廠決定。
 */
export interface Geocoder {
  /** 供應商識別碼，用於 log 與除錯。 */
  readonly id: string;
  /** 顯示名稱。 */
  readonly displayName: string;
  /** 以關鍵字搜尋地點；查無結果時回傳空陣列（而不是拋出例外）。 */
  search(query: string, options?: ProviderCallOptions): Promise<Location[]>;
}
