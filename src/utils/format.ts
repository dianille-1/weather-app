/**
 * 日期 / 時間格式化工具。
 *
 * 一律使用 Intl 與固定的 locale，避免不同瀏覽器預設語言造成顯示不一致。
 */
const LOCALE = 'zh-TW';

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 把 YYYY-MM-DD 轉成當地 Date（以 UTC 中午避免時區造成的日期偏移）。 */
function parseDateOnly(dateISO: string): Date {
  return new Date(`${dateISO}T12:00:00Z`);
}

/** YYYY-MM-DD → Date（含時區資訊的 ISO 字串）。 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 取得今天的日期字串（YYYY-MM-DD），用來判斷預報中的「今天」。 */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

/** 預報日期顯示為「今天 / 明天 / 週一 11/10」。 */
export function formatForecastDay(dateISO: string, today = todayISO()): string {
  if (dateISO === today) return '今天';

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateISO === toISODate(tomorrow)) return '明天';

  return dayFormatter.format(parseDateOnly(dateISO));
}

/** 格式化時間，例如「17:15」。 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return timeFormatter.format(date);
}

/**
 * 格式化「無時區」的時間字串（例如 "2026-11-09T17:15"）。
 *
 * Open-Meteo 在 timezone=auto 時回傳的是「觀測地的當地時間」但不含位移量，
 * 若交給 Date 解析會被當成使用者所在時區而顯示錯誤。
 * 因此直接從字串取出時分鐘，既簡單又一定正確。
 */
export function formatNaiveTime(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return '--:--';
  return `${match[4]}:${match[5]}`;
}

/**
 * 顯示某個時區的當前時間（用來顯示觀測地的「當地時間」）。
 * 無法解析時區時退回使用者所在地的時間。
 */
export function formatTimeInZone(timezone: string | null, now: Date = new Date()): string {
  if (!timezone) return timeFormatter.format(now);
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(now);
  } catch {
    return timeFormatter.format(now);
  }
}

/** 風向角度 → 中文方位，例如 315 →「西北風」。 */
const DIRECTIONS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'] as const;

export function windDirectionLabel(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % DIRECTIONS.length;
  return `${DIRECTIONS[index]}風`;
}
