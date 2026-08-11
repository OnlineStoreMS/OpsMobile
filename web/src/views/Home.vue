<template>
  <div class="page home-page">
    <header class="home-hero">
      <div class="home-hero__glow" />
      <div class="home-hero__top">
        <div>
          <div class="home-brand">OpsMobile</div>
          <div class="home-greet">{{ greet }}</div>
        </div>
        <button type="button" class="home-logout" @click="onLogout">退出</button>
      </div>
      <div class="home-user" v-if="userLabel">
        <div class="home-avatar">{{ userInitial }}</div>
        <div class="home-user__meta">
          <div class="home-user__name">{{ displayName }}</div>
          <div class="home-user__tenant">{{ tenantName }}</div>
        </div>
      </div>
      <p class="home-lead">轻量履约助手 · 建单、查单、跟发货</p>
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
const userInitial = computed(() => (displayName.value || 'O').slice(0, 1))

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
  padding: calc(18px + env(safe-area-inset-top)) 18px 22px;
  background: linear-gradient(155deg, #0b1f2a 0%, #163447 55%, #0f766e 140%);
  color: #fff;
  border-radius: 0 0 28px 28px;
  box-shadow: 0 18px 40px rgba(11, 31, 42, 0.28);
}
.home-hero__glow {
  position: absolute;
  width: 220px;
  height: 220px;
  right: -60px;
  top: -70px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.35), transparent 68%);
  pointer-events: none;
}
.home-hero__top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.home-brand {
  font-family: var(--ops-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.05;
}
.home-greet {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.68);
}
.home-logout {
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 13px;
  backdrop-filter: blur(8px);
}
.home-logout:active {
  background: rgba(255, 255, 255, 0.16);
}
.home-user {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.home-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ops-display);
  font-weight: 700;
  background: linear-gradient(145deg, #f59e0b, #d97706);
  color: #fff;
  flex-shrink: 0;
}
.home-user__name {
  font-size: 15px;
  font-weight: 650;
}
.home-user__tenant {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
}
.home-lead {
  position: relative;
  margin: 14px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}
.home-body {
  margin-top: -6px;
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
