/**
 * 資料來源呼叫的共用選項。
 *
 * 之所以抽成獨立模組，是因為「地理編碼」與「天氣預報」是兩個不同的 port，
 * 但共用同一組呼叫慣例（例如都能被 AbortSignal 中止）。
 * 讓 geocoder 反向 import weatherProvider 會製造不合理的相依方向。
 */
export interface ProviderCallOptions {
  /** 支援取消請求，用來處理「使用者快速連續搜尋」造成的競態。 */
  signal?: AbortSignal;
}
