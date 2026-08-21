import { storeClient, unwrap, type PageData } from './client'

export interface Store {
  id: number
  code: string
  name: string
  shortName?: string
  status: number
}

export interface ProductSkuSearchItem {
  productId: number
  productName: string
  productPic?: string
  skuId: number
  skuCode: string
  specLabel: string
  price: number
  stock: number
  pic?: string
  storeQty?: number
}

export interface ServiceCategory {
  id: number
  parentId: number
  name: string
  sort: number
  status: number
  itemCount?: number
  children?: ServiceCategory[]
}

export interface ServiceItem {
  id: number
  categoryId: number
  categoryName?: string
  code?: string
  name: string
  description?: string
  price: number
  durationMin?: number
  pic?: string
  sort: number
  status: number
}

export interface OrderLine {
  itemType?: 'product' | 'service'
  skuId?: number
  serviceItemId?: number
  productName: string
  skuCode?: string
  specLabel?: string
  pic?: string
  quantity: number
  originalPrice?: number
  discount?: number
  unitPrice: number
  totalAmount?: number
}

export interface PosOrder {
  id: number
  storeId: number
  orderNo: string
  status: string
  paymentMethod: string
  payStatus: string
  totalAmount: number
  paidAmount: number
  receiptHtml?: string
  createdAt?: string
  items?: OrderLine[]
}

export const storeApi = {
  listStores: async (keyword = '', page = 1, pageSize = 50) =>
    unwrap<PageData<Store>>(
      await storeClient.get('/stores', { params: { keyword, page, pageSize } }),
    ),

  searchProductSkus: async (params: { keyword: string; page?: number; pageSize?: number }) =>
    unwrap<PageData<ProductSkuSearchItem>>(
      await storeClient.get('/product-skus/search', { params }),
    ),

  createPosOrder: async (body: {
    storeId: number
    paymentMethod?: string
    isPreview?: boolean
    receiptType?: string
    remark?: string
    items: OrderLine[]
  }) => unwrap<PosOrder>(await storeClient.post('/pos-orders', body)),

  listServiceCategoryTree: async () =>
    unwrap<ServiceCategory[]>(await storeClient.get('/service-categories/tree')),

  listServiceItems: async (params?: {
    categoryId?: number
    keyword?: string
    status?: number
    page?: number
    pageSize?: number
  }) => unwrap<PageData<ServiceItem>>(await storeClient.get('/service-items', { params })),

  createServiceItem: async (
    data: Partial<ServiceItem> & { categoryId: number; name: string; price: number },
  ) => unwrap<ServiceItem>(await storeClient.post('/service-items', data)),

  previewServicePriceList: async (data: {
    storeId: number
    templateId?: number
    serviceItemIds: number[]
    groupByCategory?: boolean
  }) =>
    unwrap<{ html: string; itemCount: number; storeName: string }>(
      await storeClient.post('/service-price-list/preview', data),
    ),
}
