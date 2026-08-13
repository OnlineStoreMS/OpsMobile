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

export interface SelfShipmentItem {
  id?: number
  selfOrderItemId: number
  qty: number
}

export interface SelfShipment {
  id: number
  selfOrderId: number
  shipmentNo: string
  status: string
  carrierCode?: string
  carrierName?: string
  trackingNo?: string
  shippedAt?: string
  expectedArrivalDate?: string
  deliveredAt?: string
  callbackOk: boolean
  stockDeducted: boolean
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  remark?: string
  items: SelfShipmentItem[]
  createdAt: string
}

export const SELF_SHIPMENT_STATUS_MAP: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}

export async function listSelfShipments(selfOrderId: number) {
  return unwrap<SelfShipment[]>(await selfClient.get(`/self-orders/${selfOrderId}/shipments`))
}

export interface SelfPayment {
  id: number
  selfOrderId: number
  payAmount: number
  payMethod?: string
  payAccount?: string
  payeeAccount?: string
  payeeName?: string
  payStatus: string
  paidAt?: string
  remark?: string
  createdAt: string
}

export interface SelfAttachment {
  id: number
  selfOrderId: number
  paymentId?: number
  shipmentId?: number
  fileType: string
  fileName: string
  fileUrl: string
  remark?: string
  createdAt: string
}

export interface SelfPaymentInput {
  payAmount: number
  payMethod?: string
  payAccount?: string
  payeeAccount?: string
  payeeName?: string
  payStatus?: string
  paidAt?: string
  remark?: string
}

export const SELF_PAY_METHOD_MAP: Record<string, string> = {
  bank: '银行转账',
  alipay: '支付宝',
  wechat: '微信',
  other: '其他',
}

export async function listSelfPayments(selfOrderId: number) {
  return unwrap<SelfPayment[]>(await selfClient.get(`/self-orders/${selfOrderId}/payments`))
}

export async function createSelfPayment(selfOrderId: number, data: SelfPaymentInput) {
  return unwrap<SelfPayment>(await selfClient.post(`/self-orders/${selfOrderId}/payments`, data))
}

export async function listSelfAttachments(selfOrderId: number) {
  return unwrap<SelfAttachment[]>(await selfClient.get(`/self-orders/${selfOrderId}/attachments`))
}

export async function createSelfAttachment(
  selfOrderId: number,
  data: {
    fileType: string
    fileName: string
    fileUrl: string
    paymentId?: number
    remark?: string
  },
) {
  return unwrap<SelfAttachment>(await selfClient.post(`/self-orders/${selfOrderId}/attachments`, data))
}

/** 上传图片到 SelfCore（MinIO/本地），返回可访问 URL */
export async function uploadSelfImage(file: File, subdir = 'self/payments') {
  const form = new FormData()
  form.append('file', file)
  form.append('subdir', subdir)
  const res = await selfClient.post('/upload', form, {
    // 勿手动写 multipart boundary，交给浏览器/axios
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: 120000,
  })
  return unwrap<{ url: string; fileName: string }>(res)
}
