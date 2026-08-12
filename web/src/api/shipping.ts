import { orderClient, shippingClient, unwrap, type PageData } from './client'

export interface OMSOrder {
  id: number
  orderNo: string
  sourceChannel: string
  platform: string
  shopName?: string
  manualSourceName?: string
  buyerName?: string
  buyerPhone?: string
  shipStatus?: string
  status?: string
  payTime?: string
  orderedAt?: string
  totalAmount?: number
  payAmount?: number
  remark?: string
  sellerRemark?: string
  shipContent?: string
  selfOrderNo?: string
  items?: Array<{
    productName?: string
    skuSpecs?: string
    quantity?: number
    price?: number
    totalAmount?: number
    picUrl?: string
  }>
  address?: {
    name?: string
    phone?: string
    province?: string
    city?: string
    district?: string
    address?: string
    fullText?: string
  }
}

export interface Shipment {
  id: number
  sourceRef: string
  platform: string
  shopName?: string
  sourceChannel?: string
  manualSourceName?: string
  receiverName: string
  receiverMobile: string
  receiverProvince: string
  receiverCity: string
  receiverCounty: string
  receiverAddress: string
  mailNo: string
  status: string
  cargoName: string
  printedAt?: string
  createdAt?: string
  orderCoreOrderId?: number
  items?: Array<{
    goodsName: string
    quantity: number
    skuCode: string
  }>
}

export async function listPendingOmsOrders(params: {
  keyword?: string
  shipStatus?: string
  orderedAtStart?: string
  orderedAtEnd?: string
  page?: number
  pageSize?: number
}) {
  return unwrap<{
    list: OMSOrder[]
    total: number
    page: number
    pageSize: number
  }>(await shippingClient.get('/pending-oms-orders', { params }))
}

/** 按订单中心 ID 拉取完整待发货/OMS 订单详情 */
export async function getOmsOrder(id: number) {
  return unwrap<OMSOrder>(await orderClient.get(`/orders/${id}`))
}

export async function listShipments(params: {
  keyword?: string
  status?: string
  printedAtStart?: string
  printedAtEnd?: string
  page?: number
  pageSize?: number
}) {
  return unwrap<PageData<Shipment>>(await shippingClient.get('/shipments', { params }))
}

export async function getShipment(id: number) {
  return unwrap<Shipment>(await shippingClient.get(`/shipments/${id}`))
}
