<template>
  <div class="page home-page cs-home page--no-in">
    <HubHeader title="客服中心" tone="teal" />

    <div class="page-body home-body">
      <div v-for="sec in sections" :key="sec.title" class="hub-section">
        <div class="section-label">{{ sec.title }}</div>
        <div class="grid-apps">
          <div
            v-for="app in sec.items"
            :key="app.path"
            class="grid-app"
            :style="{ '--tile-glow': app.glow }"
            @click="router.push(app.path)"
          >
            <div class="icon-wrap" :style="{ background: app.gradient }">
              <van-icon :name="app.icon" />
            </div>
            <div class="title">{{ app.title }}</div>
            <div class="desc">{{ app.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HubHeader from '../../components/HubHeader.vue'

const router = useRouter()

const sections = [
  {
    title: '店铺管理',
    items: [
      {
        path: '/customer-service/shops',
        title: '客服店铺',
        desc: '绑定码 · 监控 · 插件',
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
      {
        path: '/customer-service/shops/new',
        title: '添加店铺',
        desc: '抖店飞鸽',
        icon: 'plus',
        gradient: 'linear-gradient(145deg, #115e59, #0d9488)',
        glow: 'rgba(13, 148, 136, 0.26)',
      },
    ],
  },
  {
    title: '自动回复',
    items: [
      {
        path: '/customer-service/auto-reply',
        title: '回复规则',
        desc: '关键词 · 寒暄模板',
        icon: 'comment-o',
        gradient: 'linear-gradient(145deg, #1d4ed8, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.28)',
      },
      {
        path: '/customer-service/auto-reply/new',
        title: '新建规则',
        desc: '精确 / 包含匹配',
        icon: 'edit',
        gradient: 'linear-gradient(145deg, #1e3a8a, #2563eb)',
        glow: 'rgba(37, 99, 235, 0.26)',
      },
      {
        path: '/customer-service/llm',
        title: 'DeepSeek 设置',
        desc: '模型 · 提示词 · 冷却',
        icon: 'cluster-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
    ],
  },
]
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.cs-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
