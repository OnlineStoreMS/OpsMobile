import { csClient, unwrap } from './client'

export type CsPluginStatus = 'unbound' | 'bound' | 'online' | 'offline'
export type CsMatchMode = 'exact' | 'contains'

export interface CsShop {
  id: number
  name: string
  platform: string
  platformLabel: string
  platformShopId?: string
  platformShopName?: string
  bindCode: string
  pluginStatus: CsPluginStatus | string
  monitorEnabled: boolean
  lastSeenAt?: string
  remark?: string
  createdAt: string
  updatedAt: string
}

export interface CsShopCreateInput {
  name: string
  platform?: string
  platformShopId?: string
  platformShopName?: string
  remark?: string
}

export interface CsShopUpdateInput {
  name?: string
  remark?: string
  monitorEnabled?: boolean
}

export interface CsAutoReplyRule {
  id: number
  shopId: number
  shopName?: string
  name: string
  enabled: boolean
  matchMode: CsMatchMode | string
  keywords: string
  replyText: string
  priority: number
  cooldownSec: number
  createdAt: string
  updatedAt: string
}

export interface CsAutoReplyInput {
  shopId?: number
  name?: string
  enabled?: boolean
  matchMode?: string
  keywords?: string
  replyText?: string
  priority?: number
  cooldownSec?: number
}

export interface CsLlmSetting {
  configured: boolean
  enabled: boolean
  styleHint: string
  cooldownSec: number
  systemPrompt: string
  defaultSystemPrompt: string
  model: string
  maxChars: number
  maxTokens: number
  timeoutSec: number
  temperature: number
  thinkingEnabled: boolean
  historyCount: number
  inboundMaxChars: number
  useProductContext: boolean
  retryStall: boolean
}

export interface CsLlmInput {
  enabled?: boolean
  styleHint?: string
  cooldownSec?: number
  systemPrompt?: string
  model?: string
  maxChars?: number
  maxTokens?: number
  timeoutSec?: number
  temperature?: number
  thinkingEnabled?: boolean
  historyCount?: number
  inboundMaxChars?: number
  useProductContext?: boolean
  retryStall?: boolean
}

export const csApi = {
  listShops: async () => unwrap<CsShop[]>(await csClient.get('/shops')),
  getShop: async (id: number) => unwrap<CsShop>(await csClient.get(`/shops/${id}`)),
  createShop: async (body: CsShopCreateInput) => unwrap<CsShop>(await csClient.post('/shops', body)),
  updateShop: async (id: number, body: CsShopUpdateInput) =>
    unwrap<CsShop>(await csClient.patch(`/shops/${id}`, body)),
  rotateBindCode: async (id: number) =>
    unwrap<CsShop>(await csClient.post(`/shops/${id}/rotate-bind-code`)),
  resetPlugin: async (id: number) => unwrap<CsShop>(await csClient.post(`/shops/${id}/reset-plugin`)),

  listAutoReplyRules: async () => unwrap<CsAutoReplyRule[]>(await csClient.get('/auto-reply-rules')),
  createAutoReplyRule: async (body: CsAutoReplyInput) =>
    unwrap<CsAutoReplyRule>(await csClient.post('/auto-reply-rules', body)),
  seedAutoReplyPresets: async () => unwrap<unknown>(await csClient.post('/auto-reply-rules/presets')),
  updateAutoReplyRule: async (id: number, body: CsAutoReplyInput) =>
    unwrap<CsAutoReplyRule>(await csClient.patch(`/auto-reply-rules/${id}`, body)),
  deleteAutoReplyRule: async (id: number) =>
    unwrap<unknown>(await csClient.delete(`/auto-reply-rules/${id}`)),

  getLlmSetting: async () => unwrap<CsLlmSetting>(await csClient.get('/llm-settings')),
  saveLlmSetting: async (body: CsLlmInput) =>
    unwrap<CsLlmSetting>(await csClient.patch('/llm-settings', body)),
}
