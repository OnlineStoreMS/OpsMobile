import { materialClient, unwrap, type PageData } from './client'

export type { PageData }

/** 素材文件 URL：相对路径补全到素材站 */
export function materialAssetUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  if (url.startsWith('/apps/')) return url
  if (url.startsWith('/')) return `/apps/material${url}`
  return `/apps/material/${url}`
}

export const materialApi = {
  listMaterials: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await materialClient.get('/materials', { params })),
  getMaterial: async (id: number) => unwrap<any>(await materialClient.get(`/materials/${id}`)),
  listCategories: async () => unwrap<any[]>(await materialClient.get('/categories')) || [],
  stats: async () => unwrap<any>(await materialClient.get('/dashboard/stats')),
}
