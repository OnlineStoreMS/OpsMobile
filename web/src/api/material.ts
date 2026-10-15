import { materialClient, unwrap, type PageData } from './client'

export type { PageData }

export type MediaType = 'image' | 'video'

export interface MediaItem {
  url: string
  mediaType: MediaType
  fileName?: string
  mime?: string
  sizeBytes?: number
}

/** 素材文件 URL：相对路径补全到素材站 */
export function materialAssetUrl(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  if (url.startsWith('/apps/')) return url
  if (url.startsWith('/')) return `/apps/material${url}`
  return `/apps/material/${url}`
}

function guessMediaType(file: File, url?: string): MediaType {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  const name = (file.name || url || '').toLowerCase()
  if (/\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(name)) return 'video'
  return 'image'
}

export async function uploadMaterialMedia(file: File, subdir = 'materials'): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file)
  form.append('subdir', subdir)
  const res = await materialClient.post('/upload', form, {
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: 120000,
  })
  const data = unwrap<{
    url: string
    mediaType?: string
    fileName?: string
    mime?: string
    sizeBytes?: number
  }>(res)
  return {
    url: data.url,
    mediaType: data.mediaType === 'video' ? 'video' : guessMediaType(file, data.url),
    fileName: data.fileName || file.name,
    mime: data.mime || file.type,
    sizeBytes: data.sizeBytes ?? file.size,
  }
}

export const materialApi = {
  listMaterials: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await materialClient.get('/materials', { params })),
  getMaterial: async (id: number) => unwrap<any>(await materialClient.get(`/materials/${id}`)),
  createMaterial: async (body: Record<string, unknown>) =>
    unwrap<any>(await materialClient.post('/materials', body)),
  updateMaterial: async (id: number, body: Record<string, unknown>) =>
    unwrap<any>(await materialClient.put(`/materials/${id}`, body)),
  deleteMaterial: async (id: number) => {
    await materialClient.delete(`/materials/${id}`)
  },
  listCategories: async () => unwrap<any[]>(await materialClient.get('/categories')) || [],
  createCategory: async (body: {
    parentId?: number
    name: string
    sort?: number
    enabled?: number
  }) => unwrap<any>(await materialClient.post('/categories', body)),
  updateCategory: async (
    id: number,
    body: Partial<{ parentId: number; name: string; sort: number; enabled: number }>,
  ) => unwrap<any>(await materialClient.put(`/categories/${id}`, body)),
  deleteCategory: async (id: number) => {
    await materialClient.delete(`/categories/${id}`)
  },
  stats: async () => unwrap<any>(await materialClient.get('/dashboard/stats')),
  uploadMedia: uploadMaterialMedia,
}
