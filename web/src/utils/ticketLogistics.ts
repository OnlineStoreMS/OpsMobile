export type LogisticsTone = 'danger' | 'warning' | 'ok' | ''

export interface LogisticsLine {
  label: string
  status?: string
  tone?: LogisticsTone
}

const LOGISTICS_STATUS_RE = /已退回|已取消|待取件|已签收|运输中|已发货/

function chunkAfter(text: string, label: string, stops: string[]) {
  const i = text.indexOf(label)
  if (i < 0) return ''
  let rest = text.slice(i + label.length)
  let cut = rest.length
  for (const stop of stops) {
    const j = rest.indexOf(stop)
    if (j >= 0 && j < cut) cut = j
  }
  return rest.slice(0, cut)
}

export function buyerReturnTone(status?: string): LogisticsTone {
  if (status === '已签收') return 'danger'
  if (status === '待取件') return 'warning'
  if (status === '运输中') return 'ok'
  return ''
}

export function parseTicketLogistics(row: {
  logistics?: string
  logisticsBuyerStatus?: string
  logisticsShipStatus?: string
  needIntercept?: boolean
  returnLogisticsNo?: string
  shipLogisticsNo?: string
  logisticsNo?: string
  awaitPickup?: boolean
}) {
  const text = row.logistics || ''
  const hasBuyer = text.includes('买家退货')
  const hasShip = text.includes('订单发货')
  const buyerStatus =
    row.logisticsBuyerStatus ||
    (hasBuyer ? chunkAfter(text, '买家退货', ['订单发货', '需商家拦截快递']).match(LOGISTICS_STATUS_RE)?.[0] || '' : '')
  const shipStatus =
    row.logisticsShipStatus ||
    (hasShip ? chunkAfter(text, '订单发货', ['买家退货', '需商家拦截快递']).match(LOGISTICS_STATUS_RE)?.[0] || '' : '')
  const intercept = row.needIntercept || (hasShip && text.includes('需商家拦截快递'))
  const lines: LogisticsLine[] = []
  if (hasBuyer) lines.push({ label: '买家退货', status: buyerStatus, tone: buyerReturnTone(buyerStatus) })
  if (hasShip) lines.push({ label: '订单发货', status: shipStatus })
  if (intercept) lines.push({ label: '需商家拦截快递', tone: 'danger' })
  if (row.awaitPickup && !lines.some((l) => l.label === '待取件')) {
    lines.push({ label: '待取件', tone: 'danger' })
  }
  return {
    lines,
    shipNo: row.shipLogisticsNo || (!row.returnLogisticsNo ? row.logisticsNo || '' : '') || '',
    returnNo: row.returnLogisticsNo || '',
  }
}

export function remainSecondsOf(row: { deadlineAt?: string; remainSeconds?: number }, now = Date.now()) {
  if (row.deadlineAt) {
    const t = Date.parse(row.deadlineAt)
    if (!Number.isNaN(t)) return Math.floor((t - now) / 1000)
  }
  return Number(row.remainSeconds || 0)
}

export function formatRemain(sec: number) {
  if (sec <= 0) return '已超时'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (d) parts.push(`${d}天`)
  if (h) parts.push(`${h}小时`)
  if (d || h || m) parts.push(`${m}分`)
  if (!d && h < 6) parts.push(`${s}秒`)
  return parts.join('') || '不足1分'
}

export function remainTone(sec: number): LogisticsTone {
  if (sec <= 0 || sec < 6 * 3600) return 'danger'
  if (sec < 24 * 3600) return 'warning'
  return ''
}

export function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

export function badgeText(n?: number) {
  const v = Number(n || 0)
  if (v <= 0) return ''
  return v > 99 ? '99+' : String(v)
}

export function trackDetail(track: { detail?: string; title?: string; date?: string; text?: string }) {
  return track.detail || (track.title || track.date ? '' : track.text || '')
}
