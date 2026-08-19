import { getPortalUrl } from './runtimeConfig'

const SESSION_CACHE_KEY = 'uc_session_profile'

let sessionVerified = false
let refreshPromise: Promise<boolean> | null = null
let ensurePromise: Promise<boolean> | null = null

export interface SessionUser {
  id: number
  email: string
  displayName: string
  isPlatform: boolean
}

export interface SessionTenant {
  id: number
  companyId?: number
  name: string
  code: string
}

export interface SessionInfo {
  user: SessionUser
  tenant: SessionTenant
  tenants: SessionTenant[]
}

export function clearToken() {
  localStorage.removeItem('uc_access_token')
  localStorage.removeItem('uc_refresh_token')
  localStorage.removeItem('uc_expires_at')
  sessionStorage.removeItem(SESSION_CACHE_KEY)
  sessionVerified = false
}

export function resetSessionVerification() {
  sessionVerified = false
}

export function saveSessionCache(info: SessionInfo) {
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(info))
}

export function loadSessionCache(): SessionInfo | null {
  const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionInfo
  } catch {
    return null
  }
}

export function redirectToPortal() {
  const back = encodeURIComponent('/apps/ops-m/')
  window.location.replace(`${getPortalUrl()}/login?redirect=${back}`)
}

export function iamBase(): string {
  return import.meta.env.VITE_IAM_API_URL || '/iam'
}

function saveExpiresAt(expiresAt: number) {
  localStorage.setItem('uc_expires_at', String(expiresAt))
}

export function saveAuthTokens(accessToken: string, _refreshToken?: string, expiresAt?: number) {
  const exp = expiresAt || (accessToken ? readJwtExp(accessToken) : undefined)
  if (exp) saveExpiresAt(exp)
  localStorage.removeItem('uc_access_token')
  localStorage.removeItem('uc_refresh_token')
}

function readJwtExp(token: string): number | undefined {
  try {
    const part = token.split('.')[1]
    if (!part) return undefined
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as { exp?: number }
    return payload.exp
  } catch {
    return undefined
  }
}

function normalizeSession(data: {
  user: SessionUser
  tenant: SessionTenant
  tenants?: SessionTenant[]
}): SessionInfo {
  return {
    user: data.user,
    tenant: data.tenant,
    tenants: data.tenants?.length ? data.tenants : [data.tenant],
  }
}

export async function tryRefreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${iamBase()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const body = await res.json()
      if (body.code !== 200 || !body.data?.accessToken) return false
      saveAuthTokens(body.data.accessToken, body.data.refreshToken, body.data.expiresAt)
      sessionVerified = true
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export async function fetchSession(): Promise<SessionInfo | null> {
  try {
    const res = await fetch(`${iamBase()}/auth/me`, { credentials: 'include' })
    if (!res.ok) return null
    const body = await res.json()
    if (body.code !== 200 || !body.data) return null
    const info = normalizeSession(body.data)
    saveSessionCache(info)
    return info
  } catch {
    return null
  }
}

export async function switchTenant(tenantId: number): Promise<SessionInfo> {
  const res = await fetch(`${iamBase()}/auth/switch-tenant`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  })
  const body = await res.json()
  if (body.code !== 200 || !body.data) {
    throw new Error(body.message || '切换租户失败')
  }
  if (body.data.accessToken) {
    saveAuthTokens(body.data.accessToken, body.data.refreshToken, body.data.expiresAt)
  } else if (body.data.expiresAt) {
    saveAuthTokens('', undefined, body.data.expiresAt)
  }
  resetSessionVerification()
  const info = normalizeSession(body.data)
  saveSessionCache(info)
  return info
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Cookie SSO：以 /auth/me 为准；登录回跳后可能需短重试 */
export async function ensureSession(): Promise<boolean> {
  if (sessionVerified) return true
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    let info = await fetchSession()
    if (info) {
      sessionVerified = true
      return true
    }

    await sleep(200)
    info = await fetchSession()
    if (info) {
      sessionVerified = true
      return true
    }

    const refreshed = await tryRefreshAccessToken()
    if (refreshed) {
      info = await fetchSession()
      if (info) {
        sessionVerified = true
        return true
      }
    }

    return false
  })()

  try {
    return await ensurePromise
  } finally {
    ensurePromise = null
  }
}

export function trustSession() {
  sessionVerified = true
}

/** 清除 Cookie SSO 会话并跳转登录页 */
export async function logout() {
  try {
    await fetch(`${iamBase()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  } catch {
    // ignore network errors; still clear local state
  }
  clearToken()
  redirectToPortal()
}
