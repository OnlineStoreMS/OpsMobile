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
}

/** 详情/物流：根行 + └ 拆分子行（对齐 SelfCore 电脑端） */
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
  // 整单拆分：无父行，直接以拆分子行展示（与电脑端一致）
  for (const ch of fullChildren) {
    out.push({
      key: `full-${ch.id}`,
      item: ch,
      isSplitChild: true,
      isSplitParent: false,
    })
  }
  return out
}

export function selfGoodsTitle(row: SelfGoodsTreeRow): string {
  const it = row.item
  if (row.isSplitChild) {
    return (it.skuSpecs || it.productName || it.skuCode || '规格').trim() || '规格'
  }
  return (it.skuSpecs || it.productName || it.skuCode || '商品').trim() || '商品'
}

export function selfGoodsMeta(row: SelfGoodsTreeRow): string {
  const it = row.item
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
