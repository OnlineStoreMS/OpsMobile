import type { SupplyOrderBrief } from '../api/supply'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function formatOrderCopyDateTime(d = new Date()): string {
  return `${d.getFullYear()} ${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatAddress(addr?: SupplyOrderBrief['address'] | null) {
  if (!addr) return '-'
  if (addr.fullText?.trim()) return addr.fullText.trim()
  const parts = [addr.name, addr.phone, addr.province, addr.city, addr.district, addr.address].filter(
    (s) => s?.trim(),
  )
  return parts.join(' ') || '-'
}

export function isMaskedReceiver(order: Pick<SupplyOrderBrief, 'buyerName' | 'buyerPhone' | 'address'>) {
  const text = [order.buyerName, order.buyerPhone, formatAddress(order.address)].join(' ')
  return /[*＊]/.test(text)
}

export function canDecryptOrder(order: Pick<SupplyOrderBrief, 'sourceChannel' | 'platformSysTid'>) {
  return order.sourceChannel === 'kdzs' && !!order.platformSysTid?.trim()
}

function buildOrderCopyBody(order: SupplyOrderBrief) {
  const address = formatAddress(order.address)
  const goods = (order.items || [])
    .map((it) => {
      const spec = (it.skuSpecs || it.productName || it.skuCode || '').trim()
      if (!spec) return ''
      const num = it.quantity && it.quantity > 0 ? it.quantity : 1
      return `${spec} x${num}`
    })
    .filter(Boolean)
    .join('\n')
  const lines = [address === '-' ? '' : address, '---']
  if (goods) lines.push(goods)
  return lines.join('\n')
}

export function buildMultiOrderCopyText(orders: SupplyOrderBrief[], now = new Date()) {
  const bodies = orders.map((o) => buildOrderCopyBody(o)).filter((t) => t.trim())
  if (!bodies.length) return ''
  if (bodies.length === 1) {
    return [formatOrderCopyDateTime(now), '', bodies[0]].join('\n')
  }
  const numbered = bodies.map((body, i) => `【${i + 1}】\n${body}`).join('\n\n')
  return [formatOrderCopyDateTime(now), '', numbered].join('\n')
}
