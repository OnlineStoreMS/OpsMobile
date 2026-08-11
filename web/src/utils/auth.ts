import { getPortalUrl } from './runtimeConfig'

const EXPIRES_KEY = 'uc_expires_at'

let sessionVerified = false
let refreshPromise: Promise<boolean> | null = null

export function getExpiresAt(): number | undefined {
  const raw = localStorage.getItem(EXPIRES_KEY)
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

export function saveExpiresAt(expiresAt: number) {
  localStorage.setItem(EXPIRES_KEY, String(expiresAt))
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

export function clearToken() {
  localStorage.removeItem('uc_access_token')
  localStorage.removeItem('uc_refresh_token')
  localStorage.removeItem(EXPIRES_KEY)
  sessionVerified = false
}

export function redirectToPortal() {
  const back = encodeURIComponent('/apps/ops-m/')
  window.location.href = `${getPortalUrl()}/login?redirect=${back}`
}

export function iamBase(): string {
  return import.meta.env.VITE_IAM_API_URL || '/iam'
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

export async function fetchSession(): Promise<{
  user: { id: number; email: string; displayName: string }
  tenant: { id: number; name: string; code: string }
} | null> {
  try {
    const res = await fetch(`${iamBase()}/auth/me`, { credentials: 'include' })
    const body = await res.json()
    if (body.code !== 200 || !body.data) return null
    return body.data
  } catch {
    return null
  }
}

export async function ensureSession(): Promise<boolean> {
  const exp = getExpiresAt()
  if (exp && exp * 1000 <= Date.now()) {
    const refreshed = await tryRefreshAccessToken()
    if (!refreshed) return false
  }
  if (sessionVerified) return true
  const info = await fetchSession()
  if (info) {
    sessionVerified = true
    return true
  }
  const refreshed = await tryRefreshAccessToken()
  if (refreshed) {
    const again = await fetchSession()
    if (again) {
      sessionVerified = true
      return true
    }
  }
  return false
}

export function trustSession() {
  sessionVerified = true
}
