<template>
  <div class="page home-page page--no-in">
    <HubHeader title="轻量履约" />

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
          <div class="home-tip__title">手机打单发货</div>
          <div class="muted">待发货可直达打单；请先配置局域网 C-Lodop 打印机</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HubHeader from '../components/HubHeader.vue'

const router = useRouter()

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
  {
    path: '/printers',
    title: '打印机管理',
    desc: 'C-Lodop 局域网配置',
    icon: 'printer',
    gradient: 'linear-gradient(145deg, #4338ca, #6366f1)',
    glow: 'rgba(99, 102, 241, 0.26)',
  },
]

function go(path: string) {
  router.push(path)
}
</script>

<style scoped>
.home-page {
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
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
