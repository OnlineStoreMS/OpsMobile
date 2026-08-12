<template>
  <div class="page home-page">
    <header class="home-hero">
      <div class="home-hero__glow" />
      <div class="home-hero__top">
        <div class="home-session" v-if="userLabel">
          <span class="home-session__user">{{ displayName }}</span>
          <span class="home-session__dot" v-if="tenantName">·</span>
          <span class="home-session__tenant" v-if="tenantName">{{ tenantName }}</span>
        </div>
        <button type="button" class="home-logout" @click="onLogout">退出</button>
      </div>
      <div class="home-brand">OpsMobile</div>
      <div class="home-greet">{{ greet }} · 轻量履约助手</div>
    </header>

    <div class="page-body home-body">
      <div class="section-label">常用能力</div>
      <div class="grid-apps">
        <div
          v-for="app in apps"
          :key="app.path"
          class="grid-app"
          :style="{ '--tile-glow': app.glow }"
          @click="go(app.path)"
        >
          <div class="icon-wrap" :style="{ background: app.gradient }">
            <van-icon :name="app.icon" />
          </div>
          <div class="title">{{ app.title }}</div>
          <div class="desc">{{ app.desc }}</div>
        </div>
      </div>

      <div class="home-tip card">
        <van-icon name="info-o" color="#0f766e" />
        <div>
          <div class="home-tip__title">手机建单后</div>
          <div class="muted">请到电脑「发货中心」完成打单发货</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { fetchSession, logout } from '../utils/auth'

const router = useRouter()
const displayName = ref('')
const tenantName = ref('')
const loggingOut = ref(false)

const userLabel = computed(() =>
  displayName.value ? `${displayName.value} · ${tenantName.value}` : '',
)

const greet = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const apps = [
  {
    path: '/manual-create',
    title: '新建手工单',
    desc: '识别地址 · 一键提交',
    icon: 'edit',
    gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
    glow: 'rgba(20, 184, 166, 0.28)',
  },
  {
    path: '/self-orders',
    title: '自营订单',
    desc: '状态与规格速览',
    icon: 'shop-o',
    gradient: 'linear-gradient(145deg, #1d4e89, #3b82f6)',
    glow: 'rgba(59, 130, 246, 0.24)',
  },
  {
    path: '/pending',
    title: '待发货',
    desc: '跟催待出库订单',
    icon: 'logistics',
    gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
    glow: 'rgba(245, 158, 11, 0.28)',
  },
  {
    path: '/shipped',
    title: '已发货',
    desc: '运单与收件人',
    icon: 'passed',
    gradient: 'linear-gradient(145deg, #047857, #10b981)',
    glow: 'rgba(16, 185, 129, 0.26)',
  },
]

function go(path: string) {
  router.push(path)
}

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

onMounted(async () => {
  const s = await fetchSession()
  if (s) {
    displayName.value = s.user.displayName || s.user.email
    tenantName.value = s.tenant.name
  }
})
</script>

<style scoped>
.home-page {
  padding-bottom: calc(28px + env(safe-area-inset-bottom));
}
.home-hero {
  position: relative;
  overflow: hidden;
  margin: 0 0 4px;
  padding: calc(12px + env(safe-area-inset-top)) 16px 16px;
  background: linear-gradient(155deg, #0b1f2a 0%, #163447 55%, #0f766e 140%);
  color: #fff;
  border-radius: 0 0 24px 24px;
  box-shadow: 0 14px 32px rgba(11, 31, 42, 0.22);
}
.home-hero__glow {
  position: absolute;
  width: 180px;
  height: 180px;
  right: -50px;
  top: -60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 68%);
  pointer-events: none;
}
.home-hero__top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 28px;
}
.home-session {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: rgba(255, 255, 255, 0.62);
  overflow: hidden;
}
.home-session__user {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home-session__dot {
  opacity: 0.55;
  flex-shrink: 0;
}
.home-session__tenant {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.home-logout {
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
.home-logout:active {
  background: rgba(255, 255, 255, 0.16);
}
.home-brand {
  position: relative;
  margin-top: 10px;
  font-family: var(--ops-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
}
.home-greet {
  position: relative;
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.66);
}
.home-body {
  margin-top: -4px;
}
.home-tip {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 16px;
}
.home-tip__title {
  font-weight: 650;
  font-size: 13px;
  margin-bottom: 2px;
}
</style>
