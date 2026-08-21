import { storesyncClient, unwrap } from './client'

export interface SyncShop {
  id: number
  platform: string
  platformName: string
  mallUserId: string
  mallUserName: string
}

export interface SyncProductSku {
  skuId?: string
  propertiesName?: string
  price?: string
  quantity?: number
  outerId?: string
  picUrl?: string
  shortTitle?: string
  productNum?: string
}

export interface SyncProduct {
  itemId: string
  title?: string
  shortTitle?: string
  outerId?: string
  picUrl?: string
  price?: string
  stock?: number
  platform?: string
  platformName?: string
  shopId?: string
  shopName?: string
  approveStatus?: string
  approveStatusLabel?: string
  productNum?: string
  skus?: SyncProductSku[]
}

export interface SyncProductList {
  total: number
  pageNo: number
  pageSize: number
  items: SyncProduct[]
  platform?: string
}

export interface RefundGoods {
  title?: string
  skuName?: string
  picUrl?: string
  num?: number
  outerId?: string
}

export interface RefundSLA {
  urgency?: string
  urgencyLabel?: string
  remainHours?: number
  deadline?: string
}

export interface RefundItem {
  refundId?: string
  tid?: string
  sysTid?: string
  afterSaleStatus?: string
  afterSaleStatusText?: string
  afterSaleType?: string | number
  afterSaleTypeText?: string
  refundReason?: string
  refundAmount?: number | string
  confirmTime?: string
  created?: string
  buyerNick?: string
  shopName?: string
  shopId?: string
  sid?: string
  sidCode?: string
  goods?: RefundGoods[]
  sla?: RefundSLA
}

export interface RefundStats {
  total: number
  waitSellerConfirmReceive: number
  waitSellerAgree: number
  refundOnlyPending: number
  exchangePending: number
  waitSendExchange: number
  returnSigned: number
  pickupPending: number
  urgent: number
  imminent: number
  critical: number
  expired: number
  waitBuyerReturn: number
  sellerRefuse: number
  refundCloseWithSid: number
  refundSuccess: number
}

export interface RefundListResponse {
  total: number
  pageNo: number
  pageSize: number
  items: RefundItem[]
  stats?: RefundStats
}

export const PLATFORM_OPTIONS = [
  { value: 'FXG', label: '抖店' },
  { value: 'TB', label: '淘宝' },
  { value: 'XHS', label: '小红书' },
]

export const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'onsale', label: '上架' },
  { value: 'instock', label: '下架' },
]

export const REFUND_STAT_CARDS: {
  key: keyof RefundStats
  label: string
  scenario: string
  tone?: 'warn' | 'danger' | 'ok'
}[] = [
  { key: 'waitSellerConfirmReceive', label: '待确认收货', scenario: 'confirm_receive' },
  { key: 'waitSellerAgree', label: '待卖家同意', scenario: 'wait_agree', tone: 'warn' },
  { key: 'refundOnlyPending', label: '仅退款待处理', scenario: 'refund_only', tone: 'danger' },
  { key: 'exchangePending', label: '换货待处理', scenario: 'exchange', tone: 'warn' },
  { key: 'waitSendExchange', label: '待发出换货', scenario: 'wait_send_exchange' },
  { key: 'returnSigned', label: '退回已签收', scenario: 'return_signed', tone: 'ok' },
  { key: 'pickupPending', label: '驿站待取件', scenario: 'pickup_pending' },
  { key: 'waitBuyerReturn', label: '待买家退货', scenario: 'wait_return' },
  { key: 'sellerRefuse', label: '卖家拒绝', scenario: 'seller_refuse', tone: 'warn' },
  { key: 'refundCloseWithSid', label: '关闭(有物流)', scenario: 'refund_close_with_sid' },
  { key: 'refundSuccess', label: '退款成功', scenario: 'refund_success', tone: 'ok' },
  { key: 'urgent', label: '时效紧迫', scenario: 'urgent', tone: 'danger' },
]

export interface ProductSyncProgress {
  finish?: boolean
  process?: number
  syncItemCount?: Record<string, number>
  errorMessage?: string
  finishSyncDate?: string
}

export const storesyncApi = {
  listShops: async () =>
    unwrap<{ items: SyncShop[]; total: number }>(await storesyncClient.get('/shops')),

  listProducts: async (params?: Record<string, unknown>) =>
    unwrap<SyncProductList>(await storesyncClient.get('/products', { params })),

  getProductSyncProgress: async (platform: string) =>
    unwrap<ProductSyncProgress>(
      await storesyncClient.get('/products/sync-progress', { params: { platform } }),
    ),

  listRefunds: async (params?: Record<string, unknown>) =>
    unwrap<RefundListResponse>(await storesyncClient.get('/refunds', { params })),

  getRefundStats: async (params?: Record<string, unknown>) =>
    unwrap<RefundStats>(await storesyncClient.get('/refunds/stats', { params })),
}
