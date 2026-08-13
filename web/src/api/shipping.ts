import { orderClient, shippingClient, unwrap, type PageData } from './client'

export interface CarrierAccount {
  id?: number
  carrierCode: string
  name: string
  partnerId: string
  checkword?: string
  useMonthly: boolean
  custId: string
  expressType: string
  templateCode: string
  customTemplateCode?: string
  signMode: string
  printChannel: string
  env: string
  enabled: boolean
  remark: string
}

export interface SFPrintPluginData {
  partnerId: string
  env: string
  templateCode: string
  mailNo: string
  requestId?: string
  accessToken?: string
  fileType?: string
  obj?: unknown
  files?: unknown
  parsedDataError?: string
  customTemplateCode?: string
  labelRemark?: string
  sdkPrintData?: {
    requestID: string
    accessToken?: string
    templateCode: string
    customTemplateCode?: string
    documents: Array<Record<string, string>>
    extJson?: Record<string, unknown>
  }
}

export interface ShipperProfile {
  id?: number
  name: string
  company: string
  mobile: string
  province: string
  city: string
  county: string
  address: string
  isDefault: boolean
  enabled: boolean
}

export interface OrderGoods {
  orderItemId?: number
  title: string
  skuName: string
  num: number
  outerId: string
  price: number
}

export interface OrderSnapshot {
  platform: string
  shopId: string
  shopName?: string
  sourceChannel?: string
  manualSourceName?: string
  /** 订单中心单号，如 OC… */
  orderNo?: string
  sysTid: string
  sourceTid: string
  receiverName: string
  receiverMobile: string
  receiverProvince: string
  receiverCity: string
  receiverCounty: string
  receiverAddress: string
  goods: OrderGoods[]
}

export interface CreateShipmentFromOrderInput {
  carrierAccountId: number
  shipperProfileId: number
  useMonthly?: boolean
  expressType?: string
  payMethod?: number
  remark?: string
  courierNote?: string
  remarkImages?: string[]
  cargoName?: string
  parcelQty?: number
  cargoCount?: number
  totalWeight?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  totalVolume?: number
  pickupMode?: 'self' | 'appoint'
  sendStartTm?: string
  orderId?: number
  sourceSystem?: 'ordercore' | 'storesyncagent'
  order: OrderSnapshot
}

export interface ConfirmKdzsShipInput {
  orderId: number
  expressNo: string
  expressCompany?: string
  order: OrderSnapshot
}

export interface ShipmentItem {
  id: number
  shipmentId: number
  goodsName: string
  quantity: number
  skuCode: string
  outerId: string
}

export interface Shipment {
  id: number
  sourceSystem?: string
  sourceRef: string
  sourceTid?: string
  platform: string
  shopId?: string
  shopName?: string
  sourceChannel?: string
  manualSourceName?: string
  carrierAccountId?: number
  shipperProfileId?: number
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
  labelUrl?: string
  labelPdfUrl?: string
  printChannel?: string
  items?: Array<{
    goodsName: string
    quantity: number
    skuCode: string
  }>
}

export interface OMSOrderItem {
  id?: number
  productName?: string
  skuSpecs?: string
  quantity?: number
  price?: number
  totalAmount?: number
  picUrl?: string
}

export interface OMSOrderShipmentItem {
  orderItemId?: number
  qty?: number
}

export interface OMSOrderShipment {
  id?: number
  expressNo?: string
  expressCompany?: string
  items?: OMSOrderShipmentItem[]
}

export interface OMSOrderAddress {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  address?: string
  fullText?: string
}

export interface OMSOrder {
  id: number
  orderNo: string
  sourceChannel: string
  platform: string
  platformOrderId?: string
  platformSysTid?: string
  shopId?: string
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
  items?: OMSOrderItem[]
  address?: OMSOrderAddress
  shipments?: OMSOrderShipment[]
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

async function page<T>(url: string, params?: Record<string, unknown>): Promise<PageData<T>> {
  const res = await shippingClient.get(url, { params })
  return unwrap(res) as PageData<T>
}

export const shippingApi = {
  listCarrierAccounts: (params?: Record<string, unknown>) =>
    page<CarrierAccount>('/carrier-accounts', params),
  listShipperProfiles: (params?: Record<string, unknown>) =>
    page<ShipperProfile>('/shipper-profiles', params),

  checkPickupTime: (body: {
    carrierAccountId: number
    province?: string
    city?: string
    county?: string
    address?: string
    cityCode?: string
  }) =>
    shippingClient.post('/sf/check-pickup-time', body).then((r) =>
      unwrap<{
        startTm: string
        endTm: string
        status: boolean
        exceptionReason?: string
        cityCode?: string
        address?: string
        options: Array<{
          value: number
          text: string
          children: Array<{
            value: string
            text: string
            slotKey: string
            sendStartTm: string
          }>
        }>
      }>(r),
    ),

  createShipmentFromOrder: (body: CreateShipmentFromOrderInput) =>
    shippingClient.post('/shipments/from-order', body).then((r) => unwrap<Shipment>(r)),
  createShipmentWaybill: (id: number) =>
    shippingClient.post(`/shipments/${id}/create-waybill`).then((r) => unwrap<Shipment>(r)),
  /** 手动/快递助手回填运单号发货（支持勾选部分商品） */
  confirmKdzsShip: (body: ConfirmKdzsShipInput) =>
    shippingClient.post('/shipments/confirm-kdzs-ship', body).then((r) => unwrap<Shipment>(r)),
  printShipment: (id: number, body?: { carrierAccountId?: number }) =>
    shippingClient
      .post(`/shipments/${id}/print`, body || {})
      .then((r) => unwrap<Shipment>(r)),
  cancelShipment: (id: number) =>
    shippingClient.post(`/shipments/${id}/cancel`).then((r) => unwrap<Shipment>(r)),

  fetchShipmentPrintPluginData: (
    id: number,
    params?: { templateCode?: string; customTemplateCode?: string; carrierAccountId?: number },
  ) =>
    shippingClient
      .get(`/shipments/${id}/print-plugin-data`, { params })
      .then((r) => unwrap<SFPrintPluginData>(r)),

  fetchShipmentLabelFile: async (
    id: number,
    params?: { carrierAccountId?: number },
  ): Promise<Blob> => {
    const res = await shippingClient.get(`/shipments/${id}/label`, {
      responseType: 'blob',
      params,
    })
    const blob = res.data as Blob
    if (!blob || blob.size === 0) {
      throw new Error('面单 PDF 为空')
    }
    const ctype = (blob.type || '').toLowerCase()
    if (ctype.includes('json') || ctype.includes('text')) {
      const text = await blob.text()
      try {
        const j = JSON.parse(text) as { message?: string }
        throw new Error(j.message || '获取面单失败')
      } catch (e) {
        if (e instanceof SyntaxError) throw new Error(text.slice(0, 200) || '获取面单失败')
        throw e
      }
    }
    return blob.type ? blob : new Blob([blob], { type: 'application/pdf' })
  },
}
