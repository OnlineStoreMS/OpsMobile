<template>
  <header class="hub-header" :class="toneClass">
    <div class="hub-header__glow" />
    <div class="hub-header__bar">
      <div class="hub-header__brand">OpsMobile</div>
      <div class="hub-header__right">
        <div v-if="displayName" class="hub-header__account" :title="accountTitle">
          <span class="hub-header__user">{{ displayName }}</span>
          <span v-if="tenantName || showTenantSwitch" class="hub-header__sep">·</span>
          <TenantSwitcher v-if="showTenantSwitch" variant="header" />
          <span v-else-if="tenantName" class="hub-header__tenant">{{ tenantName }}</span>
        </div>
        <button type="button" class="hub-header__logout" @click="onLogout">退出</button>
      </div>
    </div>
    <div class="hub-header__title">{{ title }}</div>
    <div v-if="subtitle" class="hub-header__sub">{{ subtitle }}</div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { showConfirmDialog } from 'vant'
import TenantSwitcher from './TenantSwitcher.vue'
import { useSession } from '../composables/useSession'
import { logout } from '../utils/auth'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    /** 轻微色调区分大页，结构保持一致 */
    tone?: 'default' | 'warehouse' | 'teal' | 'slate' | 'amber' | 'rose'
  }>(),
  { subtitle: '', tone: 'default' },
)

const { session, showTenantSwitch, load } = useSession()
const loggingOut = ref(false)

const toneClass = computed(() => (props.tone !== 'default' ? `hub-header--${props.tone}` : ''))
const displayName = computed(() => session.value?.user.displayName || session.value?.user.email || '')
const tenantName = computed(() => session.value?.tenant.name || '')
const accountTitle = computed(() =>
  [displayName.value, tenantName.value].filter(Boolean).join(' · '),
)

async function onLogout() {
  if (loggingOut.value) return
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定退出当前账号？',
      confirmButtonText: '退出',
      confirmButtonColor: '#0f766e',
    })
  } catch {
    return
  }
  loggingOut.value = true
  await logout()
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.hub-header {
  position: relative;
  overflow: hidden;
  margin: 0 0 4px;
  padding: calc(8px + env(safe-area-inset-top)) 16px 12px;
  background: linear-gradient(155deg, #0b1f2a 0%, #163447 55%, #0f766e 140%);
  color: #fff;
  border-radius: 0 0 24px 24px;
  box-shadow: 0 14px 32px rgba(11, 31, 42, 0.22);
}
.hub-header--warehouse {
  background: linear-gradient(155deg, #0b1f2a, #1e3a5f 55%, #0f766e);
}
.hub-header--teal {
  background: linear-gradient(155deg, #0b1f2a, #134e4a 55%, #0d9488);
}
.hub-header--slate {
  background: linear-gradient(155deg, #0b1f2a, #1e293b 55%, #334155);
}
.hub-header--amber {
  background: linear-gradient(155deg, #0b1f2a, #78350f 55%, #d97706);
}
.hub-header--rose {
  background: linear-gradient(155deg, #0b1f2a, #9f1239 50%, #e11d48);
}

.hub-header__glow {
  position: absolute;
  width: 180px;
  height: 180px;
  right: -50px;
  top: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 68%);
  pointer-events: none;
}

.hub-header__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.hub-header__brand {
  flex-shrink: 0;
  font-family: var(--ops-display);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.55);
}

.hub-header__right {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.hub-header__account {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 11px;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.62);
  overflow: hidden;
}

.hub-header__user {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  max-width: 7.5em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-header__sep {
  opacity: 0.5;
  flex-shrink: 0;
}

.hub-header__tenant {
  max-width: 8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-header__logout {
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  line-height: 1.2;
  backdrop-filter: blur(8px);
}
.hub-header__logout:active {
  background: rgba(255, 255, 255, 0.16);
}

.hub-header__title {
  position: relative;
  margin-top: 8px;
  font-family: var(--ops-display);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.hub-header__sub {
  position: relative;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}
</style>
