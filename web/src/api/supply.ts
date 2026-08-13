import { supplyClient, unwrap, type PageData } from './client'

export type { PageData }

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

export const INBOUND_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  pending_wh: '待入库审核',
  pending_finance: '待财务审核',
  completed: '已完成',
  void: '已作废',
}

export function labelPoStatus(v?: string) {
  return (v && PO_STATUS_MAP[v]) || v || '-'
}

export function labelPayStatus(v?: string) {
  return (v && PAY_STATUS_MAP[v]) || v || '-'
}

export function labelInboundStatus(v?: string) {
  return (v && INBOUND_STATUS_MAP[v]) || v || '-'
}

export const supplyApi = {
  listPurchaseOrders: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await supplyClient.get('/purchase-orders', { params })),
  getPurchaseOrder: async (id: number) =>
    unwrap<any>(await supplyClient.get(`/purchase-orders/${id}`)),

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
