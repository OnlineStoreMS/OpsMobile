import { supplyClient, unwrap, type PageData } from './client'

export type { PageData }

export interface PurchaseOrderItem {
  id?: number
  skuId?: number
  offerId?: number
  productName?: string
  skuCode?: string
  skuSpecs?: string
  picUrl?: string
  supplierSkuCode?: string
  qty: number
  saleUnitPrice?: number
  saleAmount?: number
  unitPrice: number
  lineAmount?: number
  receivedQty?: number
  refSoId?: number
  refOrderNo?: string
  refOrderItemId?: number
  parentPoItemId?: number
  splitKind?: string
  shipPlanLineId?: number
  cancelled?: boolean
  remark?: string
}

export interface PurchaseOrder {
  id: number
  poNo: string
  supplierId: number
  supplierName?: string
  status: string
  totalAmount: number
  saleAmount?: number
  currency?: string
  fulfillmentType: string
  refSoId?: number
  refTraceId?: string
  payStatus: string
  remark?: string
  orderedAt?: string
  completedAt?: string
  createdAt?: string
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderListItem {
  id: number
  poNo: string
  supplierId: number
  supplierName?: string
  status: string
  payStatus: string
  fulfillmentType: string
  saleAmount?: number
  totalAmount: number
  itemCount: number
  skuSpecs?: string
  refSoId?: number
  refTraceId?: string
  orderedAt?: string
  createdAt: string
}

export interface PoShipmentItem {
  id?: number
  poItemId: number
  skuId?: number
  qty: number
}

export interface PoShipment {
  id: number
  poId: number
  shipmentNo: string
  status: string
  carrierCode?: string
  carrierName?: string
  trackingNo?: string
  shippedAt?: string
  expectedArrivalDate?: string
  deliveredAt?: string
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  remark?: string
  items?: PoShipmentItem[]
  createdAt?: string
}

export interface SupplyOrderBrief {
  id: number
  orderNo: string
  sourceChannel?: string
  platformSysTid?: string
  buyerName?: string
  buyerNick?: string
  buyerPhone?: string
  status?: string
  shipStatus?: string
  address?: {
    name?: string
    phone?: string
    province?: string
    city?: string
    district?: string
    address?: string
    fullText?: string
  }
  items?: Array<{
    id?: number
    productName?: string
    skuSpecs?: string
    skuCode?: string
    quantity?: number
    picUrl?: string
  }>
  shipments?: Array<{
    id: number
    expressCompany?: string
    expressNo?: string
    callbackStatus?: string
    callbackMessage?: string
  }>
}

export const PO_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  ordered: '已下单',
  awaiting_ship: '待发货',
  paid: '待发货',
  partial_shipped: '部分发货',
  shipped: '已发货',
  partial_received: '部分到货',
  completed: '已完成',
  cancelled: '已取消',
}

export const PAY_STATUS_MAP: Record<string, string> = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
}

export const SHIPMENT_STATUS_MAP: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}

export const INBOUND_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  pending_wh: '待入库审核',
  pending_finance: '待财务审核',
  completed: '已完成',
  void: '已作废',
}

export const PO_STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'ordered', label: '已下单' },
  { value: 'awaiting_ship', label: '待发货' },
  { value: 'partial_shipped', label: '部分发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'partial_received', label: '部分到货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export function labelPoStatus(v?: string) {
  return (v && PO_STATUS_MAP[v]) || v || '-'
}

export function labelPayStatus(v?: string) {
  return (v && PAY_STATUS_MAP[v]) || v || '-'
}

export function labelShipmentStatus(v?: string) {
  return (v && SHIPMENT_STATUS_MAP[v]) || v || '-'
}

export function labelInboundStatus(v?: string) {
  return (v && INBOUND_STATUS_MAP[v]) || v || '-'
}

export function labelFulfillmentType(v?: string) {
  if (v === 'dropship') return '代发直邮'
  if (v === 'stock_in') return '采购入仓'
  return v || '-'
}

export const supplyApi = {
  listPurchaseOrders: async (params?: Record<string, unknown>) =>
    unwrap<PageData<PurchaseOrderListItem>>(await supplyClient.get('/purchase-orders', { params })),

  getPurchaseOrder: async (id: number) =>
    unwrap<PurchaseOrder>(await supplyClient.get(`/purchase-orders/${id}`)),

  submitPO: async (id: number) =>
    unwrap<PurchaseOrder>(await supplyClient.post(`/purchase-orders/${id}/submit`)),

  completePO: async (id: number) =>
    unwrap<PurchaseOrder>(await supplyClient.post(`/purchase-orders/${id}/complete`)),

  cancelPO: async (id: number) =>
    unwrap<PurchaseOrder>(await supplyClient.post(`/purchase-orders/${id}/cancel`)),

  deletePO: async (id: number) =>
    unwrap<{ deleted?: boolean }>(await supplyClient.delete(`/purchase-orders/${id}`)),

  mergePOs: async (body: { sourcePoIds: number[]; targetPoId?: number }) =>
    unwrap<PurchaseOrder & { mergedFromPoNos?: string[]; relinked?: number }>(
      await supplyClient.post('/purchase-orders/merge', body),
    ),

  detachSalesOrder: async (body: { poNo: string; orderNo?: string; soId?: number; reason?: string }) =>
    unwrap<PurchaseOrder>(await supplyClient.post('/purchase-orders/detach-sales-order', body)),

  updateItemPrices: async (id: number, items: { itemId: number; unitPrice: number }[]) =>
    unwrap<PurchaseOrder>(await supplyClient.put(`/purchase-orders/${id}/item-prices`, { items })),

  listShipments: async (poId: number) =>
    unwrap<PoShipment[]>(await supplyClient.get(`/purchase-orders/${poId}/shipments`)),

  syncShipmentsFromOrders: async (poId: number, refSoId?: number) =>
    unwrap<{ created: number; updated: number; skipped: number; errors?: string[] }>(
      await supplyClient.post(
        `/purchase-orders/${poId}/shipments/sync-from-orders`,
        refSoId ? { refSoId } : {},
      ),
    ),

  createShipment: async (poId: number, data: Record<string, unknown>) =>
    unwrap<PoShipment>(await supplyClient.post(`/purchase-orders/${poId}/shipments`, data)),

  updateShipmentStatus: async (poId: number, shipmentId: number, status: string) =>
    unwrap<PoShipment>(
      await supplyClient.patch(`/purchase-orders/${poId}/shipments/${shipmentId}/status`, { status }),
    ),

  splitItem: async (
    poId: number,
    itemId: number,
    lines: { skuName: string; qty: number; shipPlanLineId?: number }[],
  ) =>
    unwrap<{ syncedToOrderCore?: boolean; syncWarning?: string }>(
      await supplyClient.post(`/purchase-orders/${poId}/items/${itemId}/split`, { lines }),
    ),

  fetchOrder: async (id: number) => unwrap<SupplyOrderBrief>(await supplyClient.get(`/orders/${id}`)),

  decryptOrders: async (orderIds: number[]) =>
    unwrap<{ items: SupplyOrderBrief[]; success: number }>(
      await supplyClient.post('/orders/decrypt', { orderIds }),
    ),

  shipOrder: async (soId: number, body: Record<string, unknown>) =>
    unwrap<SupplyOrderBrief>(
      await supplyClient.post(`/orders/${soId}/ship`, body, { timeout: 180000 }),
    ),

  listSuppliers: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await supplyClient.get('/suppliers', { params })),

  listInbounds: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await supplyClient.get('/purchase-inbounds', { params })),

  getInbound: async (id: number) =>
    unwrap<any>(await supplyClient.get(`/purchase-inbounds/${id}`)),

  listPackageReceives: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await supplyClient.get('/package-receives', { params })),

  scanPackage: async (body: { trackingNo: string; warehouseId?: number; remark?: string }) =>
    unwrap<any>(await supplyClient.post('/package-receives/scan', body)),
}
