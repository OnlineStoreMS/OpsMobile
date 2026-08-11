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

export async function createManualOrder(body: Record<string, unknown>) {
  return unwrap<{
    id: number
    orderNo: string
    status?: string
    shipStatus?: string
  }>(await orderClient.post('/orders/manual', body))
}
