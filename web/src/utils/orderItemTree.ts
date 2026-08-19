import type { OmsOrderItem } from '../api/oms'

export type ItemTreeRow = {
  key: string
  item: OmsOrderItem
  isSplitChild: boolean
  isSplitParent: boolean
  fullGroupHeader?: boolean
}

function isSplitChildItem(it: OmsOrderItem) {
  return !!(it.splitKind || (it.parentOrderItemId && it.parentOrderItemId > 0))
}

/** 列表用：只展示原商品根行 */
export function listOrderRootItems(items: OmsOrderItem[] | undefined): OmsOrderItem[] {
  return (items || []).filter((it) => !isSplitChildItem(it))
}

/** 详情用：根行 + └ 拆分子行 */
export function buildItemTreeRows(items: OmsOrderItem[] | undefined): ItemTreeRow[] {
  if (!items?.length) return []
  const childrenByParent = new Map<number, OmsOrderItem[]>()
  const fullChildren: OmsOrderItem[] = []
  const roots: OmsOrderItem[] = []
  for (const it of items) {
    if (it.splitKind === 'full') {
      fullChildren.push(it)
      continue
    }
    if (it.splitKind === 'partial' && it.parentOrderItemId) {
      const list = childrenByParent.get(it.parentOrderItemId) || []
      list.push(it)
      childrenByParent.set(it.parentOrderItemId, list)
      continue
    }
    roots.push(it)
  }
  const out: ItemTreeRow[] = []
  for (const root of roots) {
    const kids = childrenByParent.get(root.id || 0) || []
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
      item: { quantity: 0, price: 0, productName: '整单拆分' },
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

export function listItemTitle(it: OmsOrderItem): string {
  return (it.productName || it.skuCode || '商品').trim() || '商品'
}

export function listItemMeta(it: OmsOrderItem): { spec?: string; sku?: string } {
  const title = listItemTitle(it)
  const spec = (it.skuSpecs || '').trim()
  const sku = (it.skuCode || '').trim()
  return {
    spec: spec && spec !== title ? spec : undefined,
    sku: sku || undefined,
  }
}

export function itemTreeTitle(node: ItemTreeRow): string {
  const it = node.item
  if (node.fullGroupHeader) return it.productName || '整单拆分'
  if (node.isSplitChild) {
    return (it.skuSpecs || it.productName || it.skuCode || '规格').trim() || '规格'
  }
  return (it.productName || it.skuCode || '商品').trim() || '商品'
}

export function itemTreeMeta(node: ItemTreeRow): { spec?: string; sku?: string } {
  const it = node.item
  const title = itemTreeTitle(node)
  const spec = (it.skuSpecs || '').trim()
  const sku = (it.skuCode || '').trim()
  return {
    spec: spec && spec !== title ? spec : undefined,
    sku: !node.isSplitChild && sku ? sku : undefined,
  }
}

export function splitKindLabel(kind?: string) {
  if (kind === 'partial') return '部分拆分'
  if (kind === 'full') return '整单拆分'
  return ''
}
