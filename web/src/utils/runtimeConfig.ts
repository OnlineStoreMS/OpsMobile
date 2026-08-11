function trimUrl(v?: string | null): string {
  return (v || '').trim().replace(/\/$/, '')
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function portalFromLocation(): string {
  if (typeof window === 'undefined' || !window.location?.hostname) return ''
  const { protocol, hostname } = window.location
  if (!hostname || isLocalHost(hostname)) return ''
  // single-host: portal is apex
  if (window.location.pathname.startsWith('/apps/')) {
    return `${protocol}//${hostname}${window.location.port ? `:${window.location.port}` : ''}`
  }
  return `${protocol}//${hostname}:5174`
}

export function getPortalUrl(): string {
  const fromRuntime = trimUrl(window.__RUNTIME_CONFIG__?.portalUrl)
  if (fromRuntime) return fromRuntime

  const fromHost = portalFromLocation()
  if (fromHost) return fromHost

  const fromEnv = trimUrl(import.meta.env.VITE_PORTAL_URL)
  if (fromEnv && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(fromEnv)) {
    return fromEnv
  }

  return 'http://localhost:5174'
}
