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

export interface ManualOrderSource {
  id: number
  name: string
  code?: string
  enabled?: boolean
}

export async function parseManualAddress(rawAddress: string) {
  return unwrap<ParsedAddress>(
    await orderClient.post('/orders/manual/parse-address', { rawAddress, batch: false }),
  )
}

export async function listManualOrderSources() {
  return unwrap<ManualOrderSource[]>(
    await orderClient.get('/manual-order-sources', {
      params: { enabledOnly: '1' },
    }),
  )
}

export async function createManualOrderSource(body: {
  name: string
  code?: string
  remark?: string
  sort?: number
  enabled?: boolean
}) {
  return unwrap<ManualOrderSource>(await orderClient.post('/manual-order-sources', body))
}

export interface RecipientSearchItem {
  customerId: number
  addressId: number
  displayName?: string
  primaryPhone?: string
  contactName?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  detail?: string
  label?: string
  isDefault?: number
}

export async function searchManualRecipients(keyword: string, page = 1, pageSize = 20) {
  return unwrap<{
    list: RecipientSearchItem[]
    total: number
    page: number
    pageSize: number
  }>(await orderClient.get('/orders/manual/recipients', { params: { keyword, page, pageSize } }))
}

export async function createManualOrder(body: Record<string, unknown>) {
  return unwrap<{
    id: number
    orderNo: string
    status?: string
    shipStatus?: string
  }>(await orderClient.post('/orders/manual', body))
}
