import type { OmsOrder, OmsOrderItem } from '../api/oms'
import { formatOrderCopyDateTime } from './supplyOrderCopy'

export function formatAddress(addr?: OmsOrder['address'] | null) {
  if (!addr) return '-'
  if (addr.fullText?.trim()) return addr.fullText.trim()
  const parts = [addr.name, addr.phone, addr.province, addr.city, addr.district, addr.address].filter((s) =>
    s?.trim(),
  )
  return parts.join(' ') || '-'
}

/** 是否仍为脱敏地址（含 *） */
export function isMaskedReceiver(order: Pick<OmsOrder, 'buyerName' | 'buyerPhone' | 'address'>) {
  const text = [order.buyerName, order.buyerPhone, formatAddress(order.address)].join(' ')
  return /[*＊]/.test(text)
}

export function canDecryptOrder(order: Pick<OmsOrder, 'sourceChannel' | 'platformSysTid'>) {
  return order.sourceChannel === 'kdzs' && !!order.platformSysTid?.trim()
}

export function formatOrderCopyGoodsLines(items?: OmsOrderItem[]) {
  return (items || [])
    .map((it) => {
      const spec = (it.skuSpecs || it.productName || it.skuCode || '').trim()
      if (!spec) return ''
      const num = it.quantity && it.quantity > 0 ? it.quantity : 1
      return `${spec} x${num}`
    })
    .filter(Boolean)
    .join('\n')
}

/** 与 StoreSyncAgent / 订单中心一致：时间 + 空行 + 收件信息 + --- + 规格行 */
export function buildOrderCopyText(order: OmsOrder, now = new Date()) {
  const address = formatAddress(order.address)
  const goodsBlock = formatOrderCopyGoodsLines(order.items)
  const lines = [formatOrderCopyDateTime(now), '', address === '-' ? '' : address, '---']
  if (goodsBlock) lines.push(goodsBlock)
  return lines.join('\n')
}
