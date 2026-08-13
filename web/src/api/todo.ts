import { todoClient, unwrap, type PageData } from './client'

export type { PageData }

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

export function labelTodoStatus(v?: string) {
  return (v && TODO_STATUS_MAP[v]) || v || '-'
}

export function labelTodoPriority(v?: string) {
  return (v && TODO_PRIORITY_MAP[v]) || v || '-'
}

export const todoApi = {
  listTodos: async (params?: Record<string, unknown>) =>
    unwrap<PageData<any>>(await todoClient.get('/todos', { params })),
  getTodo: async (id: number) => unwrap<any>(await todoClient.get(`/todos/${id}`)),
  updateStatus: async (id: number, status: string) =>
    unwrap<any>(await todoClient.patch(`/todos/${id}/status`, { status })),
  listCategories: async () => unwrap<any[]>(await todoClient.get('/categories')) || [],
  stats: async () => unwrap<any>(await todoClient.get('/dashboard/stats')),
}
