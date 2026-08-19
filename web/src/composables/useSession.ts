import { computed, ref } from 'vue'
import {
  fetchSession,
  loadSessionCache,
  switchTenant,
  type SessionInfo,
} from '../utils/auth'

const session = ref<SessionInfo | null>(loadSessionCache())
const tenantSheetOpen = ref(false)

export function useSession() {
  const showTenantSwitch = computed(() => {
    const s = session.value
    return !!s?.user.isPlatform && (s.tenants?.length ?? 0) >= 1
  })

  async function load(force = false) {
    if (!force && session.value?.tenants?.length) return session.value
    const cached = loadSessionCache()
    if (!force && cached?.tenants?.length) {
      session.value = cached
      return cached
    }
    const info = await fetchSession()
    if (info) session.value = info
    return info
  }

  async function openTenantSheet() {
    await load(true)
    if (!showTenantSwitch.value) return
    tenantSheetOpen.value = true
  }

  function closeTenantSheet() {
    tenantSheetOpen.value = false
  }

  async function switchToTenant(tenantId: number) {
    if (tenantId === session.value?.tenant.id) return session.value
    const info = await switchTenant(tenantId)
    session.value = info
    tenantSheetOpen.value = false
    const base = import.meta.env.BASE_URL || '/'
    window.location.replace(base.endsWith('/') ? base : `${base}/`)
    return info
  }

  return {
    session,
    tenantSheetOpen,
    showTenantSwitch,
    load,
    openTenantSheet,
    closeTenantSheet,
    switchToTenant,
  }
}
