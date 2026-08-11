import { shippingClient, unwrap, type PageData } from './client'

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
  items?: Array<{
    productName?: string
    skuSpecs?: string
    quantity?: number
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

export async function listShipments(params: {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}) {
  return unwrap<PageData<Shipment>>(await shippingClient.get('/shipments', { params }))
}

export async function getShipment(id: number) {
  return unwrap<Shipment>(await shippingClient.get(`/shipments/${id}`))
}
