import { orderClient, unwrap, type PageData } from './client'

export type { PageData }

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
}

export function labelOrderStatus(v?: string) {
  return (v && ORDER_STATUS_MAP[v]) || v || '-'
}

export function labelShipStatus(v?: string) {
  return (v && SHIP_STATUS_MAP[v]) || v || '-'
}

export const omsApi = {
  listOrders: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await orderClient.get('/orders', { params })),
  getOrder: async (id: number) => unwrap<any>(await orderClient.get(`/orders/${id}`)),
}
