import { todoClient, unwrap, type PageData } from './client'

export type { PageData }

export type TodoStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type TodoPriority = 'low' | 'normal' | 'high'
export type TodoRecurrence = 'none' | 'monthly'
export type MediaType = 'image' | 'video'

export interface MediaItem {
  url: string
  mediaType: MediaType
  fileName?: string
  mime?: string
  sizeBytes?: number
}

export interface TodoCategory {
  id: number
  name: string
  code?: string
  sort?: number
  enabled?: number
}

export interface TodoItem {
  id: number
  categoryId: number
  categoryName?: string
  categoryCode?: string
  title: string
  description: string
  status: TodoStatus | string
  priority: TodoPriority | string
  recurrence: TodoRecurrence | string
  recurrenceDay: number
  parentId?: number
  periodKey?: string
  isTemplate?: boolean
  isMonthlyInstance?: boolean
  dueAt?: string
  completedAt?: string
  images: MediaItem[]
  createdAt?: string
  updatedAt?: string
}

export interface TodoWriteBody {
  categoryId: number
  title: string
  description?: string
  status?: string
  priority?: string
  recurrence?: string
  recurrenceDay?: number
  dueAt?: string
  clearDueAt?: boolean
  images?: MediaItem[]
}

export const TODO_STATUS_MAP: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
  cancelled: '已取消',
}

export const TODO_PRIORITY_MAP: Record<string, string> = {
  low: '低',
  normal: '普通',
  high: '高',
}

export const TODO_STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

export const TODO_PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '高' },
]

export function labelTodoStatus(v?: string) {
  return (v && TODO_STATUS_MAP[v]) || v || '-'
}

export function labelTodoPriority(v?: string) {
  return (v && TODO_PRIORITY_MAP[v]) || v || '-'
}

function guessMediaType(file: File, url?: string): MediaType {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  const name = (file.name || url || '').toLowerCase()
  if (/\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(name)) return 'video'
  return 'image'
}

export async function uploadTodoMedia(file: File, subdir = 'todos'): Promise<MediaItem> {
  const form = new FormData()
  form.append('file', file)
  form.append('subdir', subdir)
  const res = await todoClient.post('/upload', form, {
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: 120000,
  })
  const data = unwrap<{ url: string; mediaType?: string; fileName?: string }>(res)
  return {
    url: data.url,
    mediaType: data.mediaType === 'video' ? 'video' : guessMediaType(file, data.url),
    fileName: data.fileName,
  }
}

export const todoApi = {
  listTodos: async (params?: Record<string, unknown>) =>
    unwrap<PageData<TodoItem>>(await todoClient.get('/todos', { params })),
  getTodo: async (id: number) => unwrap<TodoItem>(await todoClient.get(`/todos/${id}`)),
  createTodo: async (body: TodoWriteBody) => unwrap<TodoItem>(await todoClient.post('/todos', body)),
  updateTodo: async (id: number, body: Record<string, unknown>) =>
    unwrap<TodoItem>(await todoClient.put(`/todos/${id}`, body)),
  updateStatus: async (id: number, status: string) =>
    unwrap<TodoItem>(await todoClient.patch(`/todos/${id}/status`, { status })),
  listCategories: async () => unwrap<TodoCategory[]>(await todoClient.get('/categories')) || [],
  stats: async () => unwrap<Record<string, unknown>>(await todoClient.get('/dashboard/stats')),
  uploadMedia: uploadTodoMedia,
}
