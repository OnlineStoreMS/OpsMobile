<template>
  <div class="page home-page store-home page--no-in">
    <HubHeader title="门店管理" tone="amber" />

    <div class="page-body home-body">
      <div v-for="sec in sections" :key="sec.title" class="hub-section">
        <div class="section-label">{{ sec.title }}</div>
        <div class="grid-apps">
          <div
            v-for="app in sec.items"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HubHeader from '../../components/HubHeader.vue'

const router = useRouter()

function go(path: string) {
  router.push(path)
}

const sections = [
  {
    title: '收银',
    items: [
      {
        path: '/store/cashier',
        title: '收银台',
        desc: '查价 · 结算 · 小票',
        icon: 'balance-list-o',
        gradient: 'linear-gradient(145deg, #b45309, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.3)',
      },
    ],
  },
  {
    title: '服务',
    items: [
      {
        path: '/store/services',
        title: '服务目录',
        desc: '查阅 · 新增 · 价目表',
        icon: 'notes-o',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
    ],
  },
]
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.store-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
