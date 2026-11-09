import { agentsClient, unwrap, type PageData } from './client'

export type { PageData }

export interface DashboardStats {
  agentTotal: number
  agentOnline: number
  shopTotal: number
  jobPending: number
  jobRunning: number
}

export interface AgentShopBrief {
  platform: string
  platformShopId: string
  platformShopName: string
  browserChannel: string
  status: string
}

export interface AgentItem {
  id: number
  machineId: string
  name: string
  hostname: string
  os: string
  agentVersion: string
  status: string
  skillsJson: string
  shopCount: number
  shops?: AgentShopBrief[]
  lastHeartbeat?: string
  createdAt: string
}

export interface ShopItem {
  id: number
  agentId: number
  agentName: string
  platform: string
  platformShopId: string
  platformShopName: string
  shopPhone: string
  keepAliveStatus: string
  keepAliveHint: string
  otpSentAt?: string
  browserChannel: string
  capabilitiesJson: string
  status: string
  lastSeenAt?: string
  agentOnline: boolean
}

export interface JobItem {
  id: number
  jobType: string
  platform: string
  platformShopId: string
  platformShopName: string
  paramsJson: string
  source: string
  priority: number
  status: string
  agentId?: number
  agentName: string
  errorMessage: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

export interface SkillItem {
  id: string
  name: string
  platform: string
  description: string
  runPolicies: string[]
  defaultIntervalMinutes?: number
}

export interface AssignmentItem {
  id: number
  jobType: string
  jobTypeName: string
  platform: string
  platformShopId: string
  platformShopName: string
  enabled: boolean
  runPolicy: string
  intervalMinutes?: number | null
  lastEnqueuedAt?: string | null
  nextRunAt?: string | null
  createdAt: string
  updatedAt: string
}

export const agentsApi = {
  fetchDashboardStats: async () => unwrap<DashboardStats>(await agentsClient.get('/dashboard/stats')),
  listAgents: async (params: { page?: number; pageSize?: number }) =>
    unwrap<PageData<AgentItem>>(await agentsClient.get('/agents', { params })),
  listShops: async (params: { page?: number; pageSize?: number; platform?: string }) =>
    unwrap<PageData<ShopItem>>(await agentsClient.get('/shops', { params })),
  sendShopOtp: async (id: number, code: string) =>
    unwrap<{ ok: boolean }>(await agentsClient.post(`/shops/${id}/otp`, { code })),
  listJobs: async (params: { page?: number; pageSize?: number; status?: string; jobType?: string }) =>
    unwrap<PageData<JobItem>>(await agentsClient.get('/jobs', { params })),
  listSkills: async () => unwrap<SkillItem[]>(await agentsClient.get('/skills')),
  listAssignments: async (params: { page?: number; pageSize?: number; jobType?: string }) =>
    unwrap<PageData<AssignmentItem>>(await agentsClient.get('/assignments', { params })),
  upsertAssignment: async (body: {
    jobType: string
    platform: string
    platformShopId: string
    platformShopName?: string
    enabled?: boolean
    runPolicy?: string
    intervalMinutes?: number
    triggerNow?: boolean
    paramsJson?: string
    source?: string
    priority?: number
  }) => unwrap(await agentsClient.post('/assignments', body)),
  triggerAssignment: async (id: number, body?: { paramsJson?: string; source?: string }) =>
    unwrap(await agentsClient.post(`/assignments/${id}/trigger`, body || {})),
  setAssignmentEnabled: async (id: number, enabled: boolean) =>
    unwrap(await agentsClient.put(`/assignments/${id}/enabled`, { enabled })),
}

export function platformLabel(platform?: string) {
  if (platform === 'doudian') return '抖店'
  if (platform === 'taobao') return '淘宝'
  if (platform === 'pdd') return '拼多多'
  return platform || '—'
}

export function jobStatusLabel(status?: string) {
  const map: Record<string, string> = {
    pending: '待分配',
    claimed: '已领取',
    running: '执行中',
    succeeded: '成功',
    failed: '失败',
    cancelled: '已取消',
  }
  return (status && map[status]) || status || '—'
}

export function jobStatusType(status?: string): 'primary' | 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'succeeded') return 'success'
  if (status === 'running' || status === 'claimed') return 'primary'
  if (status === 'pending') return 'warning'
  if (status === 'failed') return 'danger'
  return 'default'
}

export function policyLabel(p?: string) {
  if (p === 'interval') return '定时间隔'
  if (p === 'on_demand') return '手动/服务端'
  if (p === 'daily') return '每日'
  return p || '—'
}

export function canSendKeepAliveOtp(row: Pick<ShopItem, 'keepAliveStatus' | 'keepAliveHint'>) {
  return row.keepAliveStatus === 'waiting_otp' && !!row.keepAliveHint?.includes('待接收')
}
