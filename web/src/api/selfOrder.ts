import { selfClient, unwrap, type PageData } from './client'

export interface SelfOrderListItem {
  id: number
  soNo: string
  status: string
  refTraceId: string
  saleAmount: number
  payStatus?: string
  buyerName?: string
  buyerPhone?: string
  shopName?: string
  skuSpecs?: string
  itemCount: number
  orderedAt?: string
  shippedAt?: string
  createdAt: string
}

export interface SelfOrderDetail {
  id: number
  soNo: string
  status: string
  refSoId: number
  refTraceId: string
  saleAmount: number
  payStatus?: string
  buyerName: string
  buyerPhone: string
  address: string
  remark: string
  shopName?: string
  orderedAt?: string
  shippedAt?: string
  createdAt: string
  items: Array<{
    id: number
    productName: string
    skuSpecs: string
    skuCode: string
    qty: number
    saleUnitPrice: number
    saleAmount: number
    picUrl?: string
  }>
}

export async function listSelfOrders(params: {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  return unwrap<PageData<SelfOrderListItem>>(await selfClient.get('/self-orders', { params }))
}

export async function getSelfOrder(id: number) {
  return unwrap<SelfOrderDetail>(await selfClient.get(`/self-orders/${id}`))
}
