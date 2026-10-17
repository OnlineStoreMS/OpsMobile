import type { SupplyOrderBrief } from '../api/supply'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function formatOrderCopyDateTime(d = new Date()): string {
  return `${d.getFullYear()} ${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 供应商订单复制地址：姓名,电话,省 市 区 详细地址 */
export function formatSupplierCopyAddress(addr?: SupplyOrderBrief['address'] | null) {
  if (!addr) return ''
  if (addr.fullText?.trim()) return addr.fullText.trim()
  const name = (addr.name || '').trim()
  const phone = (addr.phone || '').trim()
  const region = [addr.province, addr.city, addr.district].filter((s) => s?.trim()).join(' ')
  const detail = (addr.address || '').trim()
  const loc = [region, detail].filter(Boolean).join(region && detail ? ' ' : '')
  return [name, phone, loc].filter(Boolean).join(',')
}

export function formatAddress(addr?: SupplyOrderBrief['address'] | null) {
  return formatSupplierCopyAddress(addr) || '-'
}

export function isMaskedReceiver(order: Pick<SupplyOrderBrief, 'buyerName' | 'buyerPhone' | 'address'>) {
  const text = [order.buyerName, order.buyerPhone, formatSupplierCopyAddress(order.address)].join(' ')
  return /[*＊]/.test(text)
}

export function canDecryptOrder(order: Pick<SupplyOrderBrief, 'sourceChannel' | 'platformSysTid'>) {
  return order.sourceChannel === 'kdzs' && !!order.platformSysTid?.trim()
}

function formatGoodsLines(items?: SupplyOrderBrief['items']) {
  return (items || [])
    .map((it) => {
      const spec = (it.skuSpecs || it.productName || it.skuCode || '').trim()
      if (!spec) return ''
      const num = it.quantity && it.quantity > 0 ? it.quantity : 1
      return `${spec} x${num}`
    })
    .filter(Boolean)
}

function resolveTrackingNo(order: SupplyOrderBrief, trackingBySoId?: Record<number, string>) {
  const mapped = (trackingBySoId?.[order.id] || '').trim()
  if (mapped) return mapped
  for (const s of order.shipments || []) {
    const no = (s.expressNo || '').trim()
    if (no) return no
  }
  return ''
}

function buildSupplierCopyBlock(
  order: SupplyOrderBrief,
  opts?: { index?: number; trackingBySoId?: Record<number, string> },
) {
  const goods = formatGoodsLines(order.items)
  const address = formatSupplierCopyAddress(order.address)
  const tracking = resolveTrackingNo(order, opts?.trackingBySoId)
  if (!goods.length && !address) return ''

  const prefix = opts?.index != null ? `【${opts.index}】` : ''
  if (goods.length) {
    const lines = [...goods]
    if (tracking) {
      lines[lines.length - 1] = `${lines[lines.length - 1]}       ---已打快递单 ${tracking}`
    }
    lines[0] = `${prefix}${lines[0]}`
    if (address) lines.push(address)
    return lines.join('\n')
  }
  const head = `${prefix}${address}`
  return tracking ? `${head}       ---已打快递单 ${tracking}` : head
}

/** 供应商订单复制：顶部时间；多单带【1】【2】；已发货有单号则追加 ---已打快递单 */
export function buildMultiOrderCopyText(
  orders: SupplyOrderBrief[],
  now = new Date(),
  trackingBySoId?: Record<number, string>,
) {
  const multi = orders.length > 1
  const blocks = orders
    .map((o, i) =>
      buildSupplierCopyBlock(o, {
        index: multi ? i + 1 : undefined,
        trackingBySoId,
      }),
    )
    .filter((t) => t.trim())
  if (!blocks.length) return ''
  return [formatOrderCopyDateTime(now), '', blocks.join('\n\n')].join('\n')
}

export function buildTrackingBySoId(
  items: Array<{ id?: number; refSoId?: number }>,
  shipments: Array<{ trackingNo?: string; items?: Array<{ poItemId: number }> }>,
): Record<number, string> {
  const itemToSo = new Map<number, number>()
  for (const it of items) {
    if (it.id && it.refSoId && it.refSoId > 0) itemToSo.set(it.id, it.refSoId)
  }
  const out: Record<number, string> = {}
  for (const sh of shipments) {
    const no = (sh.trackingNo || '').trim()
    if (!no) continue
    for (const si of sh.items || []) {
      const soId = itemToSo.get(si.poItemId)
      if (soId && !out[soId]) out[soId] = no
    }
  }
  return out
}
