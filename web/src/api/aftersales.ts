import { aftersalesClient, unwrap, type PageData } from './client'

export type { PageData }

export type ShopPlatform = 'doudian' | 'taobao' | 'pinduoduo'
export type PluginStatus = 'unbound' | 'online' | 'offline'
export type ShopTicketKind = 'buyer-return-pickup' | 'review-shipped-refund' | 'buyer-return-signed'

export interface MarketplaceShop {
  id: number
  name: string
  platform: ShopPlatform
  platformLabel: string
  bindCode: string
  pluginStatus: PluginStatus
  pluginAvailable: boolean
  platformShopId?: string
  platformShopName?: string
  lastSyncAt?: string
  lastSeenAt?: string
  nextSyncAt?: string
  syncRequested?: boolean
  pendingTicketCount?: number
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface FilterCard {
  groupName: string
  cardKey: string
  cardLabel: string
  count: number
  sortOrder: number
}

export interface LogisticsTrack {
  date?: string
  title?: string
  detail?: string
  text?: string
}

export type AsCardRow = {
  shopName?: string
  productTitle?: string
  productImage?: string
  sku?: string
  productTags?: string
  tags?: string
  qty?: number
  buyQty?: number
  payAmount?: string
  refundAmount?: string
  aftersaleType?: string
  reason?: string
  status?: string
  orderNo?: string
  platformAftersaleId?: string
  applyTime?: string
  timeoutText?: string
  timeoutAction?: string
  timeoutDisplay?: string
  deadlineAt?: string
  remainSeconds?: number
  dispute?: string
  logistics?: string
  logisticsBuyerStatus?: string
  logisticsShipStatus?: string
  logisticsStatus?: string
  needIntercept?: boolean
  awaitPickup?: boolean
  returnLogisticsNo?: string
  shipLogisticsNo?: string
  logisticsNo?: string
  carrier?: string
  returnLocation?: string
  returnTime?: string
  tracks?: LogisticsTrack[]
  signedTime?: string
  pickupPoint?: string
  fenFaRemark?: string
}

export interface AftersaleTicket {
  id: number
  platformAftersaleId: string
  orderNo: string
  productTitle: string
  productImage?: string
  sku: string
  productTags?: string
  tags?: string
  qty: number
  buyQty: number
  payAmount: string
  refundAmount: string
  aftersaleType: string
  reason: string
  status: string
  timeoutText?: string
  timeoutAction?: string
  timeoutDisplay?: string
  deadlineAt?: string
  remainSeconds?: number
  dispute?: string
  logistics?: string
  logisticsBuyerStatus?: string
  logisticsShipStatus?: string
  needIntercept?: boolean
  returnLogisticsNo?: string
  shipLogisticsNo?: string
  tracks?: LogisticsTrack[]
  signedTime?: string
  pickupPoint?: string
  shopId?: number
  shopName?: string
  applyTime?: string
  cardKeys: string[]
  syncedAt: string
}

export interface ShopWorkbench {
  shop: MarketplaceShop
  cards: FilterCard[]
  tickets: AftersaleTicket[]
  total: number
  page: number
  pageSize: number
  lastSyncAt?: string
}

export interface ReturnPackage {
  id: number
  shopId: number
  shopName: string
  platformAftersaleId: string
  orderNo: string
  productTitle: string
  productImage?: string
  sku: string
  qty: number
  buyQty?: number
  payAmount: string
  refundAmount: string
  aftersaleType: string
  reason: string
  status: string
  orderInfo?: string
  aftersaleInfo?: string
  logistics?: string
  logisticsNo: string
  carrier?: string
  returnLocation: string
  shipTime?: string
  applyTime?: string
  returnTime?: string
  fenFaRemark?: string
  tracks?: LogisticsTrack[]
  syncedAt: string
}

export interface ShippedRefund {
  id: number
  shopId: number
  shopName: string
  platformAftersaleId: string
  orderNo: string
  productTitle: string
  productImage?: string
  sku: string
  productTags?: string
  tags?: string
  qty: number
  buyQty?: number
  payAmount: string
  refundAmount: string
  aftersaleType: string
  reason: string
  status: string
  orderInfo?: string
  aftersaleInfo?: string
  logistics?: string
  logisticsStatus?: string
  logisticsNo?: string
  carrier?: string
  shipTime?: string
  tracks?: LogisticsTrack[]
  alert?: boolean
  applyTime?: string
  signedTime?: string
  syncedAt: string
}

export interface InterceptOrder {
  id: number
  shopId: number
  shopName: string
  source: string
  needIntercept: boolean
  awaitPickup: boolean
  platformAftersaleId: string
  orderNo: string
  productTitle: string
  productImage?: string
  sku: string
  qty: number
  buyQty?: number
  payAmount: string
  refundAmount: string
  aftersaleType: string
  reason: string
  status: string
  timeoutText?: string
  timeoutAction?: string
  timeoutDisplay?: string
  deadlineAt?: string
  remainSeconds?: number
  logistics?: string
  logisticsStatus?: string
  logisticsNo?: string
  shipLogisticsNo?: string
  returnLogisticsNo?: string
  carrier?: string
  tracks?: LogisticsTrack[]
  applyTime?: string
  syncedAt: string
}

export interface ServiceOrder {
  id: number
  shopId: number
  shopName: string
  platformServiceId: string
  orderNo: string
  productTitle: string
  productImage?: string
  productContent?: string
  buyerNick?: string
  createSource?: string
  businessType?: string
  orderType?: string
  tags?: string
  statusTab: string
  status: string
  timeoutText?: string
  timeoutAction?: string
  deadlineAt?: string
  remainSeconds: number
  detail?: string
  solution?: string
  lastLog?: string
  lastLogTime?: string
  createTime?: string
  syncedAt: string
}

export interface ServiceTabCount {
  statusTab: string
  count: number
}

export interface ServiceOrderPage extends PageData<ServiceOrder> {
  tabs: ServiceTabCount[]
}

export interface NavCounts {
  pendingServiceOrders: number
  interceptOrders: number
  ticketTotal: number
  buyerReturnPickup: number
  reviewShippedRefund: number
  buyerReturnSigned: number
}

export interface PluginSetting {
  pluginSyncIntervalMin: number
  refundApplyRange?: string
  shippedRefundApplyRange: string
  returnRefundApplyRange: string
}

export const PLATFORM_OPTIONS: { value: ShopPlatform; label: string }[] = [
  { value: 'doudian', label: '抖店' },
  { value: 'taobao', label: '淘宝' },
  { value: 'pinduoduo', label: '拼多多' },
]

export const PLUGIN_STATUS_MAP: Record<PluginStatus, { label: string; type: 'primary' | 'success' | 'warning' | 'danger' }> = {
  unbound: { label: '未启用', type: 'primary' },
  online: { label: '已启用', type: 'success' },
  offline: { label: '已启用', type: 'success' },
}

export interface AgentOnlineShop {
  platform: string
  platformShopId: string
  platformShopName: string
  browserChannel: string
  agentId: number
  agentName: string
  agentOnline: boolean
}

export const PLUGIN_SYNC_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: '每 15 分钟' },
  { value: 30, label: '每 30 分钟' },
  { value: 60, label: '每 1 小时' },
  { value: 120, label: '每 2 小时' },
  { value: 360, label: '每 6 小时' },
  { value: 720, label: '每 12 小时' },
  { value: 1440, label: '每 24 小时' },
]

export const REFUND_APPLY_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
  { value: 'custom', label: '自定义' },
]

const CUSTOM_RANGE_RE = /(\d{4})[-/](\d{1,2})[-/](\d{1,2}).*?(\d{4})[-/](\d{1,2})[-/](\d{1,2})/

function padDate(n: string | number) {
  return String(n).padStart(2, '0')
}

export function toRefundApplyYmd(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${padDate(raw.getMonth() + 1)}-${padDate(raw.getDate())}`
  }
  const s = String(raw).trim()
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return `${m[1]}-${padDate(m[2])}-${padDate(m[3])}`
  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const d = new Date(t)
    return `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`
  }
  return ''
}

export function encodeRefundApplyRange(mode: string, custom?: [unknown, unknown] | unknown[] | null) {
  if (mode !== 'custom') return mode || '30'
  const from = toRefundApplyYmd(custom?.[0])
  const to = toRefundApplyYmd(custom?.[1])
  if (!from || !to) return ''
  return from <= to ? `${from},${to}` : `${to},${from}`
}

export function splitRefundApplyRange(raw?: string): { mode: string; custom: [string, string] | null } {
  const value = String(raw || '').trim()
  const m = value.match(CUSTOM_RANGE_RE)
  if (m) {
    const from = `${m[1]}-${padDate(m[2])}-${padDate(m[3])}`
    const to = `${m[4]}-${padDate(m[5])}-${padDate(m[6])}`
    return { mode: 'custom', custom: from <= to ? [from, to] : [to, from] }
  }
  if (value && value !== 'custom') return { mode: value, custom: null }
  return { mode: '30', custom: null }
}

export function refundApplyRangeLabel(raw?: string) {
  const split = splitRefundApplyRange(raw)
  if (split.mode === 'custom' && split.custom) return `${split.custom[0]} 至 ${split.custom[1]}`
  return REFUND_APPLY_RANGE_OPTIONS.find((o) => o.value === split.mode)?.label || '近 30 天'
}

export const LOGISTICS_STATUS_OPTIONS = ['待取件', '已签收', '运输中', '已发货', '已取消']

export const SERVICE_TABS = ['待处理', '处理中', '已逾期'] as const

export const TICKET_KIND_META: Record<ShopTicketKind, { title: string; placeholder: string }> = {
  'buyer-return-pickup': { title: '待取件', placeholder: '售后编号 / 订单号 / 商品 / 退货单号 / 代收点' },
  'review-shipped-refund': { title: '已发货退款', placeholder: '售后编号 / 订单号 / 商品 / 物流 / 申请原因' },
  'buyer-return-signed': { title: '退货已签收', placeholder: '售后编号 / 订单号 / 商品 / 退货单号' },
}

export const aftersalesApi = {
  fetchNavCounts: async () => unwrap<NavCounts>(await aftersalesClient.get('/nav-counts')),
  fetchPluginSetting: async () => unwrap<PluginSetting>(await aftersalesClient.get('/plugin-settings')),
  savePluginSetting: async (data: PluginSetting) =>
    unwrap<PluginSetting>(await aftersalesClient.put('/plugin-settings', data)),
  fetchShops: async () => unwrap<MarketplaceShop[]>(await aftersalesClient.get('/shops')),
  fetchShop: async (id: number) => unwrap<MarketplaceShop>(await aftersalesClient.get(`/shops/${id}`)),
  fetchAgentOnlineShops: async (platform?: string) =>
    unwrap<AgentOnlineShop[]>(await aftersalesClient.get('/agent-online-shops', { params: { platform } })),
  createShopFromAgent: async (data: {
    platform: string
    platformShopId: string
    platformShopName?: string
    jobType?: string
    name?: string
    intervalMinutes?: number
  }) => unwrap<MarketplaceShop>(await aftersalesClient.post('/shops/from-agent', data)),
  createShop: async (data: { name: string; platform?: ShopPlatform; remark?: string }) =>
    unwrap<MarketplaceShop>(await aftersalesClient.post('/shops', data)),
  updateShop: async (
    id: number,
    data: { name?: string; platformShopId?: string; platformShopName?: string; remark?: string },
  ) => unwrap<MarketplaceShop>(await aftersalesClient.put(`/shops/${id}`, data)),
  deleteShop: async (id: number) => unwrap<{ deleted: boolean }>(await aftersalesClient.delete(`/shops/${id}`)),
  resetShopBind: async (id: number) =>
    unwrap<MarketplaceShop>(await aftersalesClient.post(`/shops/${id}/reset-bind`)),
  enableAgentCollect: async (id: number) =>
    unwrap<MarketplaceShop>(await aftersalesClient.post(`/shops/${id}/enable-agent-collect`)),
  requestShopSync: async (id: number) =>
    unwrap<MarketplaceShop>(await aftersalesClient.post(`/shops/${id}/request-sync`)),
  fetchShopWorkbench: async (
    id: number,
    params?: { cardKey?: string; keyword?: string; page?: number; pageSize?: number },
  ) => unwrap<ShopWorkbench>(await aftersalesClient.get(`/shops/${id}/workbench`, { params })),
  fetchShopTicketsByKind: async (params: {
    kind: ShopTicketKind
    shopId?: number
    keyword?: string
    reason?: string
    page?: number
    pageSize?: number
  }) => unwrap<PageData<AftersaleTicket> & { reasons?: string[] }>(await aftersalesClient.get('/shop-tickets', { params })),
  fetchReturnPackages: async (params?: Record<string, unknown>) =>
    unwrap<PageData<ReturnPackage>>(await aftersalesClient.get('/return-packages', { params })),
  fetchShippedRefundReasons: async (shopId?: number) =>
    unwrap<string[]>(await aftersalesClient.get('/shipped-refunds/reasons', { params: { shopId: shopId || undefined } })),
  fetchShippedRefunds: async (params?: Record<string, unknown>) =>
    unwrap<PageData<ShippedRefund> & { reasons?: string[] }>(await aftersalesClient.get('/shipped-refunds', { params })),
  fetchReturnRefunds: async (params?: Record<string, unknown>) =>
    unwrap<PageData<ShippedRefund>>(await aftersalesClient.get('/return-refunds', { params })),
  fetchInterceptOrders: async (params?: Record<string, unknown>) =>
    unwrap<PageData<InterceptOrder>>(await aftersalesClient.get('/intercept-orders', { params })),
  fetchServiceOrders: async (params?: {
    shopId?: number
    statusTab?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) => unwrap<ServiceOrderPage>(await aftersalesClient.get('/service-orders', { params })),
}
