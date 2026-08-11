import { orderClient, unwrap } from './client'

export interface ParsedAddress {
  name?: string
  phone?: string
  tel?: string
  address?: {
    province?: string
    city?: string
    district?: string
    detail?: string
    str?: string
  }
  shipContent?: string
}

export async function parseManualAddress(rawAddress: string) {
  return unwrap<ParsedAddress>(
    await orderClient.post('/orders/manual/parse-address', { rawAddress, batch: false }),
  )
}

export async function searchPIMProducts(keyword: string, page = 1, pageSize = 20) {
  return unwrap<{
    list: Array<{
      productId?: number
      productName?: string
      skuId?: number
      skuCode?: string
      specLabel?: string
      specs?: Record<string, string> | string
      price?: number
      pic?: string
    }>
    total: number
  }>(await orderClient.get('/orders/manual/products/pim', { params: { keyword, page, pageSize } }))
}

export async function createManualOrder(body: Record<string, unknown>) {
  return unwrap<{
    id: number
    orderNo: string
    status?: string
    shipStatus?: string
  }>(await orderClient.post('/orders/manual', body))
}
