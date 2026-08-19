import type { PurchaseOrderItem } from '../api/supply'

export type PoItemTreeRow = {
  key: string
  item: PurchaseOrderItem
  isSplitChild: boolean
  isSplitParent: boolean
}

function isSplitChild(it: PurchaseOrderItem) {
  return !!(it.splitKind || (it.parentPoItemId && it.parentPoItemId > 0))
}

export function listPoRootItems(items: PurchaseOrderItem[] | undefined): PurchaseOrderItem[] {
  return (items || []).filter((it) => !it.cancelled && !isSplitChild(it))
}

/** 详情树：父行 + └ 拆分子行（取消行仍展示但标记） */
export function buildPoItemTree(items: PurchaseOrderItem[] | undefined): PoItemTreeRow[] {
  if (!items?.length) return []
  const childrenByParent = new Map<number, PurchaseOrderItem[]>()
  const roots: PurchaseOrderItem[] = []
  for (const it of items) {
    if (it.splitKind === 'partial' && it.parentPoItemId) {
      const list = childrenByParent.get(it.parentPoItemId) || []
      list.push(it)
      childrenByParent.set(it.parentPoItemId, list)
      continue
    }
    if (!isSplitChild(it)) roots.push(it)
  }
  const out: PoItemTreeRow[] = []
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
  return out
}

export function poItemTitle(row: PoItemTreeRow): string {
  const it = row.item
  if (row.isSplitChild) {
    return (it.skuSpecs || it.productName || it.skuCode || '规格').trim() || '规格'
  }
  return (it.productName || it.skuCode || '商品').trim() || '商品'
}

export function poItemMeta(row: PoItemTreeRow): { spec?: string; sku?: string } {
  const it = row.item
  const title = poItemTitle(row)
  const spec = (it.skuSpecs || '').trim()
  const sku = (it.skuCode || '').trim()
  return {
    spec: !row.isSplitChild && spec && spec !== title ? spec : undefined,
    sku: !row.isSplitChild && sku ? sku : undefined,
  }
}

/** 可发货：拆分子行；或无拆分的普通行。父行有 partial 子行则不可发 */
export function isShippablePoItem(it: PurchaseOrderItem, all: PurchaseOrderItem[]): boolean {
  if (it.cancelled) return false
  if (it.splitKind === 'partial' || (it.parentPoItemId && it.parentPoItemId > 0)) return true
  const hasKids = all.some(
    (x) => !x.cancelled && x.parentPoItemId === it.id && x.splitKind === 'partial',
  )
  return !hasKids
}

export function splitKindLabel(kind?: string) {
  if (kind === 'partial') return '部分拆分'
  if (kind === 'full') return '整单拆分'
  return ''
}
