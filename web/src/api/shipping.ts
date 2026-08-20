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
  printLogo?: boolean
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
  /** 发货计划行 ID（拆分规格） */
  planLineId?: number
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
  /** 发货通道：sf=丰桥；kdzs=快递助手 */
  shipVia?: 'sf' | 'kdzs' | string
  expressCompany?: string
  status: string
  errorMessage?: string
  cargoName: string
  /** 首次发货/出单时间 */
  shippedAt?: string
  printedAt?: string
  createdAt?: string
  orderCoreOrderId?: number
  sfOrderId?: string
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
  parentOrderItemId?: number
  splitKind?: '' | 'partial' | 'full'
  shipPlanLineId?: number
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
  /** 待发拆分段数（前端写入） */
  pendingPlanCount?: number
  /** 发货计划行 */
  shipPlanLines?: ShipPlanLine[]
}

export interface ShipPlanLine {
  id: number
  orderCoreId: number
  orderItemId: number
  splitOrderItemId?: number
  skuName: string
  qty: number
  sortNo: number
  status: string
}

export interface ShipPlanLineInput {
  orderItemId: number
  skuName: string
  qty: number
  sortNo?: number
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

  queryDeliverTm: (body: {
    carrierAccountId: number
    srcProvince?: string
    srcCity?: string
    srcCounty?: string
    srcAddress?: string
    destProvince?: string
    destCity?: string
    destCounty?: string
    destAddress?: string
    weightKg?: number
    useMonthly?: boolean
    consignedTime?: string
    businessType?: string
  }) =>
    shippingClient.post('/sf/query-deliver-tm', body).then((r) =>
      unwrap<{
        products: Array<{
          value: string
          name: string
          tag?: string
          hint?: string
          fee?: number
          deliverTime?: string
          deliverLabel?: string
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
  getShipPlan: (orderId: number, status?: string) =>
    shippingClient
      .get(`/orders/${orderId}/ship-plan`, { params: status ? { status } : undefined })
      .then((r) => unwrap<{ list: ShipPlanLine[]; total: number }>(r)),
  putShipPlan: (orderId: number, lines: ShipPlanLineInput[]) =>
    shippingClient
      .put(`/orders/${orderId}/ship-plan`, { lines })
      .then((r) => unwrap<{ list: ShipPlanLine[]; total: number }>(r)),
  countPendingShipPlans: (orderIds: number[]) =>
    shippingClient
      .get('/ship-plan/pending-counts', {
        params: { orderIds: orderIds.filter((id) => id > 0).join(',') },
      })
      .then((r) => unwrap<{ counts: Record<string, number> }>(r)),
  /** 出单后预计派送时间 EXP_RECE_SEARCH_PROMITM */
  searchPromiseTm: (id: number) =>
    shippingClient.get(`/shipments/${id}/promise-tm`).then((r) =>
      unwrap<{
        mailNo: string
        promiseTm?: string
        promiseLabel?: string
        hint?: string
      }>(r),
    ),
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

  listExpressTemplates: (params?: Record<string, unknown>) =>
    page<ExpressTemplate>('/express-templates', params),

  createKdzsPrintPairSession: () =>
    shippingClient.post('/kdzs-print/pair-sessions').then((r) =>
      unwrap<{ pairCode: string; expireAt: string }>(r),
    ),
  listKdzsPrintDevices: () =>
    shippingClient.get('/kdzs-print/devices').then((r) =>
      unwrap<{ list: KdzsPrintDevice[]; total: number }>(r),
    ),
  renameKdzsPrintDevice: (id: number, name: string) =>
    shippingClient.put(`/kdzs-print/devices/${id}`, { name }).then((r) => unwrap<KdzsPrintDevice>(r)),
  unbindKdzsPrintDevice: (id: number) =>
    shippingClient.delete(`/kdzs-print/devices/${id}`).then((r) => unwrap<{ ok: boolean }>(r)),
  createKdzsPrintTask: (body: { deviceId: number; payload: Record<string, unknown> }) =>
    shippingClient.post('/kdzs-print/tasks', body).then((r) => unwrap<KdzsPrintTask>(r)),
  listKdzsPrintTasks: () =>
    shippingClient.get('/kdzs-print/tasks').then((r) =>
      unwrap<{ list: KdzsPrintTask[]; total: number }>(r),
    ),
}

export interface ExpressTemplate {
  id?: number
  templateId?: string
  templateName?: string
  platform?: string
  carrierCode?: string
  carrierName?: string
  shopName?: string
  enabled?: boolean
}

export interface KdzsPrintDevice {
  id: number
  deviceKey: string
  name: string
  online: boolean
  lastSeenAt?: string
  enabled: boolean
  createdAt: string
}

export interface KdzsPrintTask {
  id: number
  deviceId: number
  status: string
  payload?: unknown
  errorMessage?: string
  createdAt: string
}
