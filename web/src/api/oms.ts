import { orderClient, unwrap, type PageData } from './client'

export type { PageData }

export interface OmsOrderItem {
  id?: number
  skuId?: number
  skuCode?: string
  platformSkuId?: string
  platformOid?: string
  productName?: string
  skuSpecs?: string
  picUrl?: string
  quantity: number
  price: number
  totalAmount?: number
  afterSaleStatus?: string
  afterSaleStatusText?: string
  lineOrderStatus?: string
  parentOrderItemId?: number
  splitKind?: '' | 'partial' | 'full'
  shipPlanLineId?: number
}

export interface OmsOrderAddress {
  name?: string
  phone?: string
  province?: string
  city?: string
  district?: string
  address?: string
  fullText?: string
}

export interface OmsShipmentItem {
  id?: number
  orderItemId: number
  qty: number
  skuCode?: string
  productName?: string
  skuSpecs?: string
}

export interface OmsShipment {
  id: number
  shipmentNo: string
  expressCompany?: string
  expressNo?: string
  needTracking?: boolean
  callbackStatus?: string
  callbackMessage?: string
  shippedAt?: string
  items?: OmsShipmentItem[]
}

export interface OmsStatusLog {
  id?: number
  fromStatus?: string
  toStatus?: string
  action?: string
  remark?: string
  createdAt?: string
}

export interface OmsOrder {
  id: number
  orderNo: string
  sourceChannel?: string
  platform?: string
  platformOrderId?: string
  platformSysTid?: string
  shopId?: string
  shopName?: string
  manualSourceId?: number
  manualSourceName?: string
  status: string
  shipStatus?: string
  allocType?: string
  dropshipMode?: string
  supplierId?: number
  supplierName?: string
  factoryId?: string
  factoryName?: string
  purchaseOrderId?: string
  selfOrderNo?: string
  buyerNick?: string
  buyerName?: string
  buyerPhone?: string
  totalAmount?: number
  payAmount?: number
  freightAmount?: number
  payStatus?: string
  payTime?: string
  orderedAt?: string
  platformStatus?: string
  platformStatusText?: string
  ecommerceStatus?: string
  ecommerceStatusText?: string
  afterSaleStatus?: string
  afterSaleStatusText?: string
  agentType?: number
  shipEntryLocked?: boolean
  shipLockReason?: string
  remark?: string
  sellerRemark?: string
  sellerFlag?: number
  shipContent?: string
  fenFaRemark?: string
  printerRemark?: string
  allocRemark?: string
  allocatedAt?: string
  shippedAt?: string
  createdAt?: string
  updatedAt?: string
  items?: OmsOrderItem[]
  address?: OmsOrderAddress
  shipments?: OmsShipment[]
  statusLogs?: OmsStatusLog[]
}

export interface OmsSupplier {
  id: number
  name: string
  code?: string
  status?: number
}

export const ORDER_STATUS_MAP: Record<string, string> = {
  pending_payment: '待付款',
  pending_alloc: '待分配',
  pending_ship: '待分配',
  allocated: '已分配',
  purchasing: '采购中',
  shipped: '已发货',
  partial_ship: '部分发货',
  completed: '已完成',
  closed: '已关闭',
}

export const SHIP_STATUS_MAP: Record<string, string> = {
  wait_ship: '待发货',
  partial_shipped: '部分发货',
  shipped: '已发货',
  need_ship: '待发货',
}

export const SOURCE_CHANNEL_MAP: Record<string, string> = {
  kdzs: '电商',
  wx_mall: '商城',
  store: '门店',
  xianyu: '闲鱼',
  manual: '手工单',
}

export const ALLOC_TYPE_MAP: Record<string, string> = {
  self_ship: '自营发货',
  dropship: '供应商代发',
  purchase_then_ship: '采转销',
}

export const ORDER_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'kdzs', label: '电商' },
  { value: 'manual', label: '手工单' },
  { value: 'wx_mall', label: '商城' },
  { value: 'store', label: '门店' },
  { value: 'xianyu', label: '闲鱼' },
]

export const SHIP_STATUS_OPTIONS = [
  { value: '', label: '全部发货' },
  { value: 'wait_ship', label: '待发货' },
  { value: 'partial_shipped', label: '部分发货' },
  { value: 'shipped', label: '已发货' },
]

export function labelOrderStatus(v?: string) {
  return (v && ORDER_STATUS_MAP[v]) || v || '-'
}

export function labelShipStatus(v?: string) {
  return (v && SHIP_STATUS_MAP[v]) || v || '-'
}

export function labelSourceChannel(v?: string) {
  return (v && SOURCE_CHANNEL_MAP[v]) || v || '-'
}

export function labelAllocType(v?: string) {
  return (v && ALLOC_TYPE_MAP[v]) || v || '-'
}

export const omsApi = {
  listOrders: async (params?: Record<string, unknown>) =>
    unwrap<PageData<OmsOrder>>(await orderClient.get('/orders', { params })),

  getOrder: async (id: number) => unwrap<OmsOrder>(await orderClient.get(`/orders/${id}`)),

  allocateOrder: async (id: number, body: Record<string, unknown>) =>
    unwrap<OmsOrder>(await orderClient.post(`/orders/${id}/allocate`, body)),

  revokeAllocate: async (id: number) =>
    unwrap<OmsOrder>(await orderClient.post(`/orders/${id}/revoke-allocate`)),

  batchDropship: async (body: { orderIds: number[]; supplierId: number; supplierName?: string }) =>
    unwrap<{
      poNo: string
      poId: number
      success: number
      failed: number
      errors?: string[]
    }>(await orderClient.post('/orders/batch-dropship', body)),

  decryptOrders: async (orderIds: number[]) =>
    unwrap<{ items: OmsOrder[]; success: number }>(
      await orderClient.post('/orders/decrypt', { orderIds }),
    ),

  /** 是否可下发抖店 WA「解密真实手机号」（与订单中心电脑端一致） */
  canDecryptRealPhone: (order: Pick<OmsOrder, 'platform' | 'shopId' | 'platformOrderId'>) => {
    const p = (order.platform || '').trim().toUpperCase()
    return (p === 'FXG' || p === 'DOUDIAN') && !!order.shopId?.trim() && !!order.platformOrderId?.trim()
  },

  startDecryptPhone: async (orderId: number) =>
    unwrap<{ jobId: number; orderId: number; orderNo: string }>(
      await orderClient.post(`/orders/${orderId}/decrypt-phone`),
    ),

  pollDecryptPhone: async (orderId: number, jobId: number) =>
    unwrap<{
      jobId: number
      status: string
      errorMessage?: string
      applied?: boolean
      order?: OmsOrder | null
    }>(await orderClient.get(`/orders/${orderId}/decrypt-phone`, { params: { jobId } })),

  /** 下发并轮询抖店解密真实手机号，成功后返回写回后的订单 */
  decryptRealPhone: async (orderId: number, opts?: { intervalMs?: number; timeoutMs?: number }) => {
    const intervalMs = opts?.intervalMs ?? 2000
    const timeoutMs = opts?.timeoutMs ?? 180_000
    const started = await omsApi.startDecryptPhone(orderId)
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, intervalMs))
      const st = await omsApi.pollDecryptPhone(orderId, started.jobId)
      if (st.status === 'succeeded') {
        if (st.order) return st.order
        throw new Error('解密成功但未返回订单')
      }
      if (st.status === 'failed' || st.status === 'cancelled') {
        throw new Error(st.errorMessage || '解密任务失败')
      }
    }
    throw new Error('解密超时，请确认 WindowsAgent 已在线且该店勾选了解密手机号能力')
  },

  pushOrder: async (id: number, event = 'manual_push') =>
    unwrap<OmsOrder>(await orderClient.post(`/orders/${id}/push`, null, { params: { event } })),

  updateRemarks: async (
    id: number,
    body: {
      sellerRemark?: string
      sellerFlag?: number
      fenFaRemark?: string
      printerRemark?: string
      allocRemark?: string
    },
  ) => unwrap<OmsOrder>(await orderClient.put(`/orders/${id}/remarks`, body)),

  listSuppliers: async (params?: Record<string, unknown>) =>
    unwrap<PageData<OmsSupplier>>(await orderClient.get('/suppliers', { params })),
}
