import { getPortalUrl } from './runtimeConfig'

let sessionVerified = false
let refreshPromise: Promise<boolean> | null = null
let ensurePromise: Promise<boolean> | null = null

export function clearToken() {
  localStorage.removeItem('uc_access_token')
  localStorage.removeItem('uc_refresh_token')
  localStorage.removeItem('uc_expires_at')
  sessionVerified = false
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
    if (!res.ok) return null
    const body = await res.json()
    if (body.code !== 200 || !body.data) return null
    return body.data
  } catch {
    return null
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Cookie SSO：以 /auth/me 为准；登录回跳后可能需短重试 */
export async function ensureSession(): Promise<boolean> {
  if (sessionVerified) return true
  if (ensurePromise) return ensurePromise

  ensurePromise = (async () => {
    // 1) 直接读会话（cookie）
    let info = await fetchSession()
    if (info) {
      sessionVerified = true
      return true
    }

    // 2) 登录刚 Set-Cookie 后偶发首请求未带上，短等再试
    await sleep(200)
    info = await fetchSession()
    if (info) {
      sessionVerified = true
      return true
    }

    // 3) 用 refresh cookie 续期后再读
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
