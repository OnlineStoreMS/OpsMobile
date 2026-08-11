/** 自营单状态 */
const selfOrderStatusLabels: Record<string, string> = {
  draft: '草稿',
  ordered: '待发货',
  confirmed: '待发货',
  paid: '已付款',
  partial_shipped: '部分发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  wait_ship: '待发货',
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
  completed: '已完成',
  closed: '已关闭',
}

const shipStatusLabels: Record<string, string> = {
  wait_ship: '待发货',
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

export function labelSelfStatus(v?: string) {
  if (!v) return '-'
  return selfOrderStatusLabels[v] || v
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
  if (channel === 'manual') {
    return (row.manualSourceName || '').trim() || '手工订单'
  }
  const src = labelSource(channel)
  const plat = labelPlatform((row.platform || '').trim())
  const shop = (row.shopName || '').trim()
  if (src !== '-' && shop) return `${src} · ${shop}`
  if (src !== '-' && plat !== '-') return `${src} · ${plat}`
  if (src !== '-') return src
  if (shop) return shop
  if (plat !== '-') return plat
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
