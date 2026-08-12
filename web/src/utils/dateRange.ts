/** 本地日历日 YYYY-MM-DD */
export function formatDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDay(): string {
  return formatDay(new Date())
}

/** API 查询用：日起 00:00:00 ～ 日止 23:59:59 */
export function toApiDateTimeRange(startDay: string, endDay: string) {
  return {
    start: `${startDay} 00:00:00`,
    end: `${endDay} 23:59:59`,
  }
}

export function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return formatDay(d)
}

export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
