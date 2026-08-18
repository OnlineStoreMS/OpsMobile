export type SelfGoodsItem = {
  id: number
  productName: string
  skuSpecs?: string
  skuCode?: string
  qty: number
  saleUnitPrice?: number
  saleAmount?: number
  picUrl?: string
  parentSelfOrderItemId?: number
  splitKind?: '' | 'partial' | 'full'
}

export type SelfGoodsTreeRow = {
  key: string
  item: SelfGoodsItem
  isSplitChild: boolean
  isSplitParent: boolean
  fullGroupHeader?: boolean
}

function isSplitChild(it: SelfGoodsItem) {
  return !!(it.splitKind || (it.parentSelfOrderItemId && it.parentSelfOrderItemId > 0))
}

export function buildSelfGoodsTreeRows(items: SelfGoodsItem[] | undefined): SelfGoodsTreeRow[] {
  if (!items?.length) return []
  const childrenByParent = new Map<number, SelfGoodsItem[]>()
  const fullChildren: SelfGoodsItem[] = []
  const roots: SelfGoodsItem[] = []
  for (const it of items) {
    if (it.splitKind === 'full') {
      fullChildren.push(it)
      continue
    }
    if (it.splitKind === 'partial' && it.parentSelfOrderItemId) {
      const list = childrenByParent.get(it.parentSelfOrderItemId) || []
      list.push(it)
      childrenByParent.set(it.parentSelfOrderItemId, list)
      continue
    }
    roots.push(it)
  }
  const out: SelfGoodsTreeRow[] = []
  for (const root of roots) {
    const kids = childrenByParent.get(root.id) || []
    out.push({
      key: `root-${root.id}`,
      item: root,
      isSplitChild: false,
      isSplitParent: kids.length > 0,
    })
    for (const ch of kids) {
      out.push({
        key: `child-${ch.id}`,
        item: ch,
        isSplitChild: true,
        isSplitParent: false,
      })
    }
  }
  if (fullChildren.length) {
    out.push({
      key: 'full-header',
      item: { id: 0, productName: '整单拆分', qty: 0 },
      isSplitChild: false,
      isSplitParent: false,
      fullGroupHeader: true,
    })
    for (const ch of fullChildren) {
      out.push({
        key: `full-${ch.id}`,
        item: ch,
        isSplitChild: true,
        isSplitParent: false,
      })
    }
  }
  return out
}

export function selfGoodsTitle(row: SelfGoodsTreeRow): string {
  const it = row.item
  if (row.fullGroupHeader) return '整单拆分'
  if (row.isSplitChild) return (it.skuSpecs || it.productName || it.skuCode || '规格').trim() || '规格'
  return (it.productName || it.skuCode || '商品').trim() || '商品'
}

export function selfGoodsMeta(row: SelfGoodsTreeRow): string {
  const it = row.item
  if (row.fullGroupHeader) return ''
  const title = selfGoodsTitle(row)
  const parts: string[] = []
  const spec = (it.skuSpecs || '').trim()
  const sku = (it.skuCode || '').trim()
  if (!row.isSplitChild && spec && spec !== title) parts.push(spec)
  if (!row.isSplitChild && sku) parts.push(sku)
  parts.push(`×${it.qty}`)
  if (!row.isSplitChild && it.saleAmount != null) parts.push(`¥${Number(it.saleAmount || 0).toFixed(2)}`)
  return parts.join(' · ')
}
