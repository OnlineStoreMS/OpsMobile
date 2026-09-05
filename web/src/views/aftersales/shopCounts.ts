import { aftersalesApi, type ShopTicketKind } from '../../api/aftersales'

export async function loadShopChipCounts(
  shops: Array<{ id: number }>,
  fetchTotal: (shopId?: number) => Promise<number>,
): Promise<{ allCount: number; counts: Record<number, number> }> {
  const [allCount, ...rest] = await Promise.all([
    fetchTotal(undefined).catch(() => 0),
    ...shops.map((s) => fetchTotal(s.id).catch(() => 0)),
  ])
  const counts: Record<number, number> = {}
  shops.forEach((s, i) => {
    counts[s.id] = rest[i] || 0
  })
  return { allCount: allCount || 0, counts }
}

export async function loadTicketKindShopCounts(kind: ShopTicketKind, shops: Array<{ id: number }>) {
  const first = await aftersalesApi.fetchShopTicketsByKind({ kind, page: 1, pageSize: 200 })
  const rows = first.list || []
  const allCount = first.total || 0
  if (allCount > rows.length) {
    return loadShopChipCounts(shops, async (shopId) => {
      const res = await aftersalesApi.fetchShopTicketsByKind({
        kind,
        shopId,
        page: 1,
        pageSize: 1,
      })
      return res.total || 0
    })
  }
  const counts: Record<number, number> = {}
  for (const row of rows) {
    const id = Number(row.shopId || 0)
    if (!id) continue
    counts[id] = (counts[id] || 0) + 1
  }
  return { allCount, counts }
}
