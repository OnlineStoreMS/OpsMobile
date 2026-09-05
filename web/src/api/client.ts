import axios, { type AxiosInstance } from 'axios'
import { redirectToPortal, tryRefreshAccessToken, clearToken } from '../utils/auth'

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}

export interface PageData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type AppApi =
  | 'order'
  | 'self'
  | 'shipping'
  | 'warehouse'
  | 'supply'
  | 'material'
  | 'todo'
  | 'storesync'
  | 'store'
  | 'aftersales'

function apiBase(app: AppApi): string {
  return `/apps/${app}/api/v1/admin`
}

function createClient(app: AppApi): AxiosInstance {
  const client = axios.create({
    baseURL: apiBase(app),
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  })

  client.interceptors.response.use(
    (res) => {
      const body = res.data as ApiResponse
      if (body.code !== 200) {
        return Promise.reject(new Error(body.message || '请求失败'))
      }
      return res
    },
    async (err) => {
      const cfg = err.config as { _retry?: boolean } | undefined
      if (err.response?.status === 401 && cfg && !cfg._retry) {
        const ok = await tryRefreshAccessToken()
        if (ok) {
          cfg._retry = true
          return client.request(cfg as any)
        }
        clearToken()
        redirectToPortal()
      } else if (err.response?.status === 401) {
        clearToken()
        redirectToPortal()
      }
      const msg = err.response?.data?.message || err.message || '请求失败'
      return Promise.reject(new Error(msg))
    },
  )

  return client
}

export const orderClient = createClient('order')
export const selfClient = createClient('self')
export const shippingClient = createClient('shipping')
export const warehouseClient = createClient('warehouse')
export const supplyClient = createClient('supply')
export const materialClient = createClient('material')
export const todoClient = createClient('todo')
export const storesyncClient = createClient('storesync')
export const storeClient = createClient('store')
export const aftersalesClient = createClient('aftersales')

export function unwrap<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data as T
}
