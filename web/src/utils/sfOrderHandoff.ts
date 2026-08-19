import type { OMSOrder, OrderGoods, OrderSnapshot, ShipPlanLine } from '../api/shipping'

export const SF_ORDER_HANDOFF_KEY = 'shippingcore.sfOrder.handoff'
export const LAST_CARRIER_KEY = 'opsmobile.ship.lastCarrierAccountId'
export const LAST_SHIPPER_KEY = 'opsmobile.ship.lastShipperProfileId'

export interface SFOrderHandoff {
  orderId?: number
  sourceSystem?: 'ordercore' | 'storesyncagent'
  order: OrderSnapshot
  /** 打单页预选物流账号 / 寄件人 */
  carrierAccountId?: number
  shipperProfileId?: number
  /** 本次为部分发货勾选，下单成功后回到「部分发货」列表 */
  partialShip?: boolean
}

/** 订单中心拆分子行：列表/勾选由计划行承载 */
export function isOMSSplitChild(it?: { splitKind?: string; parentOrderItemId?: number } | null) {
  if (!it) return false
  return !!(it.splitKind || (it.parentOrderItemId && it.parentOrderItemId > 0))
}

export function rootOMSItems(order?: OMSOrder | null) {
  return (order?.items || []).filter((it) => !isOMSSplitChild(it))
}

/** 订单同步后根行 id 可能变化，拆分计划上的 orderItemId 会失效；尽量重绑到当前根行 */
export function rematchPlanParentId(
  order: OMSOrder,
  orderItemId?: number,
  splitOrderItemId?: number,
): number {
  const roots = rootOMSItems(order)
  const want = Number(orderItemId || 0)
  if (want > 0 && roots.some((r) => r.id === want)) return want
  if (splitOrderItemId) {
    const child = (order.items || []).find((it) => it.id === splitOrderItemId)
    const parentId = Number(child?.parentOrderItemId || 0)
    if (parentId > 0 && roots.some((r) => r.id === parentId)) return parentId
  }
  if (roots.length === 1 && roots[0].id) return roots[0].id
  return 0
}

export function healShipPlanLines(order: OMSOrder, lines: ShipPlanLine[]): ShipPlanLine[] {
  if (!lines?.length) return lines || []
  return lines.map((l) => {
    if (!l.orderItemId) return l
    const next = rematchPlanParentId(order, l.orderItemId, l.splitOrderItemId)
    if (!next || next === l.orderItemId) return l
    return { ...l, orderItemId: next }
  })
}

function isShippableOMSItem(
  order: OMSOrder,
  it: NonNullable<OMSOrder['items']>[number],
): boolean {
  if (it.splitKind === 'partial' || it.splitKind === 'full') return true
  const items = order.items || []
  if (items.some((x) => x.splitKind === 'full')) return false
  if (it.id && items.some((x) => x.splitKind === 'partial' && x.parentOrderItemId === it.id)) {
    return false
  }
  return true
}

/** 订单行已发数量（有明细运单时按明细；无明细且整单已发完时视为全部已发） */
export function shippedQtyByItem(order: OMSOrder): Record<number, number> {
  const map: Record<number, number> = {}
  let hasItemRows = false
  for (const sh of order.shipments || []) {
    if (sh.items?.length) {
      hasItemRows = true
      for (const it of sh.items) {
        if (!it.orderItemId || !(it.qty && it.qty > 0)) continue
        map[it.orderItemId] = (map[it.orderItemId] || 0) + it.qty
      }
    }
  }
  if (!hasItemRows && (order.shipments || []).length > 0 && order.shipStatus === 'shipped') {
    for (const it of order.items || []) {
      if (it.id && isShippableOMSItem(order, it)) map[it.id] = it.quantity || 0
    }
  }
  return map
}

export function remainingQtyByItem(order: OMSOrder): Record<number, number> {
  const shipped = shippedQtyByItem(order)
  const out: Record<number, number> = {}
  for (const it of order.items || []) {
    if (!it.id) continue
    if (!isShippableOMSItem(order, it)) {
      out[it.id] = 0
      continue
    }
    out[it.id] = Math.max(0, (it.quantity || 0) - (shipped[it.id] || 0))
  }
  return out
}

/** 从整段中文地址尽量拆出省/市/区与明细（OMS 常只给 fullText）。 */
export function parseChineseRegion(raw: string): {
  province: string
  city: string
  county: string
  address: string
} {
  const text = (raw || '').replace(/\s+/g, '').trim()
  if (!text) return { province: '', city: '', county: '', address: '' }
  const m = text.match(
    /^(?<province>[\u4e00-\u9fa5]+?(?:省|自治区|特别行政区|市))(?<city>[\u4e00-\u9fa5]+?(?:市|自治州|地区|盟|区|县))?(?<county>[\u4e00-\u9fa5]+?(?:区|县|市|旗|镇))?(?<address>.*)$/,
  )
  if (!m?.groups) return { province: '', city: '', county: '', address: text }
  return {
    province: m.groups.province || '',
    city: m.groups.city || '',
    county: m.groups.county || '',
    address: (m.groups.address || '').trim() || text,
  }
}

function resolveReceiverAddress(addr?: {
  province?: string
  city?: string
  district?: string
  address?: string
  fullText?: string
}) {
  let province = (addr?.province || '').trim()
  let city = (addr?.city || '').trim()
  let county = (addr?.district || '').trim()
  let detail = (addr?.address || '').trim()
  const full = (addr?.fullText || '').trim()
  if ((!province || !city) && full) {
    const parsed = parseChineseRegion(full)
    if (!province) province = parsed.province
    if (!city) city = parsed.city
    if (!county) county = parsed.county
    if (!detail) detail = parsed.address
  }
  if (!detail) detail = full
  return { province, city, county, address: detail }
}

export function omsOrderToSnapshot(
  order: OMSOrder,
  opts?: { itemIndexes?: number[]; qtyByItemId?: Record<number, number> },
): OrderSnapshot {
  const addr = order.address
  const manualSource = (order.manualSourceName || '').trim()
  const shopName = (order.shopName || '').trim() || manualSource
  const all = order.items || []
  const remaining = opts?.qtyByItemId || remainingQtyByItem(order)
  const indexes = opts?.itemIndexes
  const picked =
    indexes && indexes.length
      ? indexes
          .filter((i) => i >= 0 && i < all.length)
          .map((i) => all[i])
          .filter(Boolean)
      : all.filter((g) => {
          if (!g.id) return true
          if (!isShippableOMSItem(order, g)) return false
          const left = remaining[g.id]
          return left == null || left > 0
        })
  const receiver = resolveReceiverAddress(addr)
  return {
    platform: order.platform || '',
    shopId: order.shopId || '',
    shopName,
    sourceChannel: order.sourceChannel || '',
    manualSourceName: manualSource,
    orderNo: order.orderNo || '',
    sysTid: order.platformSysTid || '',
    sourceTid: order.platformOrderId || order.orderNo,
    receiverName: addr?.name || order.buyerName || '',
    receiverMobile: addr?.phone || order.buyerPhone || '',
    receiverProvince: receiver.province,
    receiverCity: receiver.city,
    receiverCounty: receiver.county,
    receiverAddress: receiver.address,
    goods: picked
      .map((g) => {
        const spec = (g.skuSpecs || '').trim()
        const product = (g.productName || '').trim()
        const id = g.id || 0
        const left = id ? remaining[id] : undefined
        if (id && left != null && left <= 0) return null
        const num =
          left != null && left > 0
            ? left
            : g.quantity && g.quantity > 0
              ? g.quantity
              : 1
        return {
          orderItemId: id,
          title: product,
          skuName: spec || product,
          num,
          outerId: '',
          price: 0,
        }
      })
      .filter((g): g is NonNullable<typeof g> => !!g),
  }
}

/** 按勾选的可发货行生成快照（含拆分计划行） */
export function buildShipPickSnapshot(
  order: OMSOrder,
  rows: Array<{
    orderItemId: number
    planLineId?: number
    skuName: string
    shipQty: number
    maxQty: number
  }>,
): OrderSnapshot {
  const base = omsOrderToSnapshot(order, { itemIndexes: [] })
  const goods: OrderGoods[] = []
  for (const r of rows) {
    const spec = (r.skuName || '').trim()
    const need = Math.min(Math.max(1, r.shipQty || 1), Math.max(1, r.maxQty || 1))
    if (!(r.orderItemId > 0)) {
      throw new Error(`「${spec || '规格'}」尚未同步订单中心子行，请重新保存拆分后再打单`)
    }
    goods.push({
      orderItemId: r.orderItemId,
      planLineId: r.planLineId || 0,
      title: spec,
      skuName: spec,
      num: need,
      outerId: '',
      price: 0,
    })
  }
  return { ...base, goods }
}

/** 列表/详情商品展示：有拆分计划时用规格行替换被拆原商品 */
export function orderGoodsDisplayRows(order: OMSOrder) {
  const shippedMap = shippedQtyByItem(order)
  const plans = healShipPlanLines(order, order.shipPlanLines || [])
  const pendingPlans = plans.filter((l) => l.status === 'pending')
  const shippedPlans = plans.filter((l) => l.status === 'shipped')
  const isFullOrderPlan =
    pendingPlans.some((l) => !l.orderItemId) ||
    (pendingPlans.length === 0 &&
      shippedPlans.length > 0 &&
      shippedPlans.every((l) => !l.orderItemId))

  type Row = {
    key: string
    title: string
    picUrl?: string
    shipped: number
    total: number
    fullyShipped: boolean
    isSplit: boolean
  }
  const rows: Row[] = []
  const rootItems = rootOMSItems(order)

  if (isFullOrderPlan) {
    for (const p of [...pendingPlans, ...shippedPlans]) {
      const qty = Math.max(1, p.qty || 1)
      const done = p.status === 'shipped'
      rows.push({
        key: `plan:${p.id}`,
        title: `${(p.skuName || '').trim() || `规格#${p.id}`} ×${qty}`,
        shipped: done ? qty : 0,
        total: qty,
        fullyShipped: done,
        isSplit: true,
      })
    }
    return rows
  }

  if (plans.length) {
    const covered = new Set(plans.map((l) => l.orderItemId).filter((id) => id > 0))
    for (const p of pendingPlans) {
      const qty = Math.max(1, p.qty || 1)
      const item = rootItems.find((it) => it.id === p.orderItemId)
      rows.push({
        key: `plan:${p.id}`,
        title: `${(p.skuName || '').trim() || `规格#${p.id}`} ×${qty}`,
        picUrl: item?.picUrl,
        shipped: 0,
        total: qty,
        fullyShipped: false,
        isSplit: true,
      })
    }
    for (const p of shippedPlans) {
      if (!p.orderItemId) continue
      const qty = Math.max(1, p.qty || 1)
      const item = rootItems.find((it) => it.id === p.orderItemId)
      rows.push({
        key: `plan-shipped:${p.id}`,
        title: `${(p.skuName || '').trim() || `规格#${p.id}`} ×${qty}`,
        picUrl: item?.picUrl,
        shipped: qty,
        total: qty,
        fullyShipped: true,
        isSplit: true,
      })
    }
    rootItems.forEach((g, idx) => {
      if (g.id && covered.has(g.id)) return
      const shipped = g.id ? shippedMap[g.id] || 0 : 0
      const total = g.quantity || 0
      const name = (g.skuSpecs || g.productName || '商品').trim()
      rows.push({
        key: `item:${idx}`,
        title: total > 1 ? `${name} ×${total}` : name,
        picUrl: g.picUrl,
        shipped,
        total,
        fullyShipped: shipped > 0 && total > 0 && shipped >= total,
        isSplit: false,
      })
    })
    return rows
  }

  return rootItems.map((g, idx) => {
    const shipped = g.id ? shippedMap[g.id] || 0 : 0
    const total = g.quantity || 0
    const name = (g.skuSpecs || g.productName || '商品').trim()
    return {
      key: `item:${idx}`,
      title: total > 1 ? `${name} ×${total}` : name,
      picUrl: g.picUrl,
      shipped,
      total,
      fullyShipped: shipped > 0 && total > 0 && shipped >= total,
      isSplit: false,
    }
  })
}

export function formatOrderGoodsSummary(order: OMSOrder): string {
  const rows = orderGoodsDisplayRows(order)
  if (!rows.length) return '-'
  const first = rows[0].title
  if (rows.length > 1) return `${first} 等${rows.length}行`
  return first
}

export function buildShipPickRows(order: OMSOrder, planLines: ShipPlanLine[]) {
  const remaining = remainingQtyByItem(order)
  const pending = healShipPlanLines(order, planLines).filter((l) => l.status === 'pending')
  type Row = {
    key: string
    kind: 'plan' | 'item'
    planLineId?: number
    orderItemId: number
    itemIndex?: number
    label: string
    skuName: string
    maxQty: number
    shipQty: number
    picUrl?: string
  }
  const rows: Row[] = []

  for (const line of pending) {
    const item = (order.items || []).find((it) => it.id === line.orderItemId)
    const spec = (line.skuName || '').trim()
    const maxQty = Math.max(1, line.qty || 1)
    rows.push({
      key: `plan:${line.id}`,
      kind: 'plan',
      planLineId: line.id,
      orderItemId: line.splitOrderItemId || line.orderItemId || 0,
      label: spec || item?.productName || `规格#${line.id}`,
      skuName: spec,
      maxQty,
      shipQty: maxQty,
      picUrl: item?.picUrl,
    })
  }

  const isFullOrderPlan = pending.some((l) => !l.orderItemId)
  if (isFullOrderPlan) return rows

  const covered = new Set(pending.map((l) => l.orderItemId).filter((id) => id > 0))
  rootOMSItems(order).forEach((item, index) => {
    if (!item?.id || covered.has(item.id)) return
    const left = remaining[item.id] ?? item.quantity ?? 0
    if (left <= 0) return
    const spec = (item.skuSpecs || '').trim()
    const product = (item.productName || '').trim()
    const name = spec || product || `商品#${item.id}`
    rows.push({
      key: `item:${item.id || index}`,
      kind: 'item',
      orderItemId: item.id,
      itemIndex: index,
      label: name,
      skuName: name,
      maxQty: left,
      shipQty: left,
      picUrl: item.picUrl,
    })
  })
  return rows
}

export function saveSFOrderHandoff(payload: SFOrderHandoff) {
  sessionStorage.setItem(SF_ORDER_HANDOFF_KEY, JSON.stringify(payload))
}

export function consumeSFOrderHandoff(): SFOrderHandoff | null {
  const raw = sessionStorage.getItem(SF_ORDER_HANDOFF_KEY)
  if (!raw) return null
  sessionStorage.removeItem(SF_ORDER_HANDOFF_KEY)
  try {
    return JSON.parse(raw) as SFOrderHandoff
  } catch {
    return null
  }
}

export function rememberShipPrefs(carrierAccountId?: number, shipperProfileId?: number) {
  if (carrierAccountId) localStorage.setItem(LAST_CARRIER_KEY, String(carrierAccountId))
  if (shipperProfileId) localStorage.setItem(LAST_SHIPPER_KEY, String(shipperProfileId))
}

export function readLastCarrierId(): number | undefined {
  const n = Number(localStorage.getItem(LAST_CARRIER_KEY) || '')
  return n > 0 ? n : undefined
}

export function readLastShipperId(): number | undefined {
  const n = Number(localStorage.getItem(LAST_SHIPPER_KEY) || '')
  return n > 0 ? n : undefined
}

/** 发货内容：优先规格名称（skuName），无规格时才用商品名称 */
export function goodsShipName(g: OrderGoods): string {
  return (g.skuName || g.title || '商品').trim() || '商品'
}

export function goodsCargoName(goods: OrderGoods[]): string {
  const first = goods.find((g) => (g.skuName || g.title || '').trim())
  return first ? goodsShipName(first) : '商品'
}

export function goodsParcelQty(_goods: OrderGoods[]): number {
  return 1
}

/** 简单粘贴识别：姓名 手机 地址 */
export function parsePastedContact(text: string): {
  name?: string
  mobile?: string
  address?: string
} {
  const raw = text.replace(/\s+/g, ' ').trim()
  if (!raw) return {}
  const mobileMatch = raw.match(/(1[3-9]\d{9})/)
  const mobile = mobileMatch?.[1]
  let rest = raw
  if (mobile) rest = rest.replace(mobile, ' ').replace(/[,，]/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = rest.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return { name: parts[0], mobile, address: parts.slice(1).join(' ') }
  }
  const tokens = rest.split(' ').filter(Boolean)
  if (tokens.length >= 2) {
    return { name: tokens[0], mobile, address: tokens.slice(1).join(' ') }
  }
  return { name: rest || undefined, mobile }
}
