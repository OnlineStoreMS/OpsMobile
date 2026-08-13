import { warehouseClient, unwrap, type PageData } from './client'

export type { PageData }

async function page<T>(url: string, params?: Record<string, unknown>) {
  return unwrap<PageData<T>>(await warehouseClient.get(url, { params }))
}

export async function uploadWarehouseImage(file: File, subdir = 'products') {
  const form = new FormData()
  form.append('file', file)
  form.append('subdir', subdir)
  const res = await warehouseClient.post('/upload', form, {
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: 120000,
  })
  return unwrap<{ url: string; fileName?: string }>(res)
}

export const whApi = {
  listCategories: (params?: Record<string, unknown>) => page<any>('/categories', params),
  listPackSpecs: (params?: Record<string, unknown>) => page<any>('/pack-specs', params),

  listProducts: (params?: Record<string, unknown>) => page<any>('/products', params),
  getProduct: async (id: number) => unwrap<any>(await warehouseClient.get(`/products/${id}`)),
  createProductWithSkus: async (body: unknown) =>
    unwrap<any>(await warehouseClient.post('/products/with-skus', body)),
  updateProductWithSkus: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.put(`/products/${id}/with-skus`, body)),

  listSkus: (params?: Record<string, unknown>) => page<any>('/skus', params),
  getSku: async (id: number) => unwrap<any>(await warehouseClient.get(`/skus/${id}`)),

  listWarehouses: (params?: Record<string, unknown>) => page<any>('/warehouses', params),
  createWarehouse: async (body: unknown) => unwrap<any>(await warehouseClient.post('/warehouses', body)),
  updateWarehouse: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.put(`/warehouses/${id}`, body)),
  deleteWarehouse: async (id: number) => unwrap<any>(await warehouseClient.delete(`/warehouses/${id}`)),

  listLocations: (params?: Record<string, unknown>) => page<any>('/locations', params),
  createLocation: async (body: unknown) => unwrap<any>(await warehouseClient.post('/locations', body)),
  updateLocation: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.put(`/locations/${id}`, body)),
  deleteLocation: async (id: number) => unwrap<any>(await warehouseClient.delete(`/locations/${id}`)),
  listLocationSkus: async (id: number) =>
    unwrap<any[]>(await warehouseClient.get(`/locations/${id}/skus`)),
  bindLocationSku: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.post(`/locations/${id}/skus`, body)),
  unbindLocationSku: async (id: number) =>
    unwrap<any>(await warehouseClient.delete(`/location-skus/${id}`)),

  stockBalances: (params?: Record<string, unknown>) => page<any>('/stock/balances', params),
  stockSummary: (params?: Record<string, unknown>) => page<any>('/stock/summary', params),
  stockMovements: (params?: Record<string, unknown>) => page<any>('/stock/movements', params),

  listOtherIn: (params?: Record<string, unknown>) => page<any>('/other-inbounds', params),
  getOtherIn: async (id: number) => unwrap<any>(await warehouseClient.get(`/other-inbounds/${id}`)),
  createOtherIn: async (body: unknown) =>
    unwrap<any>(await warehouseClient.post('/other-inbounds', body)),
  postOtherIn: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/other-inbounds/${id}/post`)),
  cancelOtherIn: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/other-inbounds/${id}/cancel`)),

  listOtherOut: (params?: Record<string, unknown>) => page<any>('/other-outbounds', params),
  getOtherOut: async (id: number) => unwrap<any>(await warehouseClient.get(`/other-outbounds/${id}`)),
  createOtherOut: async (body: unknown) =>
    unwrap<any>(await warehouseClient.post('/other-outbounds', body)),
  postOtherOut: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/other-outbounds/${id}/post`)),
  cancelOtherOut: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/other-outbounds/${id}/cancel`)),

  listStocktakes: (params?: Record<string, unknown>) => page<any>('/stocktakes', params),
  getStocktake: async (id: number) => unwrap<any>(await warehouseClient.get(`/stocktakes/${id}`)),
  createStocktake: async (body: unknown) =>
    unwrap<any>(await warehouseClient.post('/stocktakes', body)),
  updateStocktake: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.put(`/stocktakes/${id}`, body)),
  addStocktakeItems: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.post(`/stocktakes/${id}/items`, body)),
  deleteStocktakeItem: async (id: number, itemId: number) =>
    unwrap<any>(await warehouseClient.delete(`/stocktakes/${id}/items/${itemId}`)),
  saveStocktakeCounts: async (id: number, body: unknown) =>
    unwrap<any>(await warehouseClient.post(`/stocktakes/${id}/save-counts`, body)),
  postStocktake: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/stocktakes/${id}/post`)),
  cancelStocktake: async (id: number) =>
    unwrap<any>(await warehouseClient.post(`/stocktakes/${id}/cancel`)),
  listStocktakeDetails: (params?: Record<string, unknown>) => page<any>('/stocktake-details', params),
}

export const MOVE_TYPE_MAP: Record<string, string> = {
  other_in: '其它入库',
  other_out: '其它出库',
  transfer_in: '调拨入',
  transfer_out: '调拨出',
  stocktake_gain: '盘盈',
  stocktake_loss: '盘亏',
  purchase_in: '采购入库',
  sale_out: '销售出库',
}

export const DOC_STATUS_MAP: Record<string, string> = {
  draft: '草稿',
  counting: '盘点中',
  posted: '已过账',
  cancelled: '已取消',
}
