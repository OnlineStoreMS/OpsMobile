/** 单据状态展示：已下单 / 已完成 / 已取消（付款中/发货中均归为已下单） */
const selfDocStatusLabels: Record<string, string> = {
  ordered: '已下单',
  completed: '已完成',
  cancelled: '已取消',
}

/** 自营发货状态 */
const selfShipStatusLabels: Record<string, string> = {
  wait_ship: '待发货',
  partial_shipped: '部分发货',
  shipped: '已发货',
}

/** 付款状态 */
const selfPayStatusLabels: Record<string, string> = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付清',
}

/** OMS 履约状态 */
const omsStatusLabels: Record<string, string> = {
  pending_payment: '待付款',
  pending_alloc: '待分配',
  pending_ship: '待分配',
  allocated: '已分配',
  purchasing: '采购中',
  shipped: '已发货',
  partial_ship: '部分发货',
  partial_shipped: '部分发货',
  completed: '已完成',
  closed: '已关闭',
}

const shipStatusLabels: Record<string, string> = {
  wait_ship: '待发货',
  partial_shipped: '部分发货',
  shipped: '已发货',
}

const sourceLabels: Record<string, string> = {
  kdzs: '电商',
  manual: '手工订单',
  self: '自建',
  mall: '商城',
}

const platformLabels: Record<string, string> = {
  FXG: '抖店',
  TB: '淘宝',
  XHS: '小红书',
  PDD: '拼多多',
  KSXD: '快手',
  DFHAND: '手工单',
  MANUAL: '手工单',
}

/** 单据状态：仅区分已下单 / 已完成 / 已取消 */
export function deriveSelfDocStatus(status?: string): string {
  const s = (status || '').trim()
  if (s === 'completed') return 'completed'
  if (s === 'cancelled') return 'cancelled'
  if (!s) return ''
  return 'ordered'
}

export function deriveSelfShipStatus(status?: string): string {
  switch ((status || '').trim()) {
    case 'partial_shipped':
      return 'partial_shipped'
    case 'shipped':
    case 'completed':
      return 'shipped'
    case 'draft':
    case 'ordered':
    case 'paid':
    case 'confirmed':
      return 'wait_ship'
    default:
      return ''
  }
}

export function labelSelfDocStatus(v?: string) {
  const doc = deriveSelfDocStatus(v)
  if (!doc) return '-'
  return selfDocStatusLabels[doc] || v || '-'
}

export function labelSelfShipStatus(v?: string) {
  const ship = deriveSelfShipStatus(v)
  if (!ship) return ''
  return selfShipStatusLabels[ship] || ship
}

export function labelSelfPayStatus(v?: string) {
  const s = (v || '').trim()
  if (!s) return '未付款'
  return selfPayStatusLabels[s] || s
}

/** @deprecated 兼容旧调用 */
export function labelSelfStatus(v?: string) {
  return labelSelfShipStatus(v) || labelSelfDocStatus(v)
}

export function labelOmsStatus(v?: string) {
  if (!v) return '-'
  return omsStatusLabels[v] || v
}

export function labelShipStatus(v?: string) {
  if (!v) return '-'
  return shipStatusLabels[v] || v
}

export function labelSource(v?: string) {
  if (!v) return '-'
  return sourceLabels[v] || v
}

export function labelPlatform(v?: string) {
  if (!v) return '-'
  return platformLabels[v] || v
}

/** 列表「订单来源」：手工单优先展示手工来源名 */
export function formatOrderSource(row: {
  sourceChannel?: string
  manualSourceName?: string
  platform?: string
  shopName?: string
}) {
  const channel = (row.sourceChannel || '').trim()
  const plat = (row.platform || '').trim().toUpperCase()
  const isManual =
    channel === 'manual' || plat === 'DFHAND' || plat === 'MANUAL' || plat === 'HAND'
  if (isManual) {
    return (row.manualSourceName || row.shopName || '').trim() || '手工订单'
  }
  const src = labelSource(channel)
  const platLabel = labelPlatform(plat)
  const shop = (row.shopName || '').trim()
  if (src !== '-' && shop) return `${src} · ${shop}`
  if (src !== '-' && platLabel !== '-') return `${src} · ${platLabel}`
  if (src !== '-') return src
  if (shop) return shop
  if (platLabel !== '-') return platLabel
  return '-'
}

export function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

export function formatSpecLine(items?: Array<{ productName?: string; skuSpecs?: string; quantity?: number }>, fallbackSpecs?: string) {
  if (fallbackSpecs?.trim()) return fallbackSpecs.trim()
  if (!items?.length) return '-'
  const first = items[0]
  const name = (first.skuSpecs || first.productName || '商品').trim()
  if (items.length > 1) return `${name} 等${items.length}件`
  const qty = first.quantity
  if (qty && qty > 1) return `${name} ×${qty}`
  return name || '-'
}
