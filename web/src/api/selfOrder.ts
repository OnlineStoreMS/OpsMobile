import { selfClient, unwrap, type PageData } from './client'

export interface SelfOrderListItem {
  id: number
  soNo: string
  status: string
  refSoId?: number
  refTraceId: string
  saleAmount: number
  payStatus?: string
  buyerName?: string
  buyerPhone?: string
  sourceChannel?: string
  platform?: string
  shopName?: string
  manualSourceName?: string
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
  sourceChannel?: string
  platform?: string
  shopName?: string
  manualSourceName?: string
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
  statuses?: string
  excludeStatuses?: string
  payStatus?: string
  shipStatus?: string
  /** 自营单创建时间（≈分配时间） */
  createdAtStart?: string
  createdAtEnd?: string
  /** 销售单下单时间 */
  orderedAtStart?: string
  orderedAtEnd?: string
  page?: number
  pageSize?: number
}) {
  return unwrap<PageData<SelfOrderListItem>>(await selfClient.get('/self-orders', { params }))
}

export interface SelfOrderStatusCounts {
  all: number
  byStatus: Record<string, number>
  waitShip: number
  unpaid: number
}

export async function getSelfOrderStatusCounts(params: {
  keyword?: string
  createdAtStart?: string
  createdAtEnd?: string
  orderedAtStart?: string
  orderedAtEnd?: string
}) {
  return unwrap<SelfOrderStatusCounts>(await selfClient.get('/self-orders/status-counts', { params }))
}

export async function getSelfOrder(id: number) {
  return unwrap<SelfOrderDetail>(await selfClient.get(`/self-orders/${id}`))
}
