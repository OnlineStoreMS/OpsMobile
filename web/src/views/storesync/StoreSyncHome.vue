<template>
  <div class="page home-page storesync-home page--no-in">
    <HubHeader title="电商店铺同步" tone="rose" />

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
    title: '电商商品',
    items: [
      {
        path: '/storesync/products',
        title: '电商商品',
        desc: '店铺 · 上架状态 · 价格库存',
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #9f1239, #e11d48)',
        glow: 'rgba(225, 29, 72, 0.28)',
      },
    ],
  },
  {
    title: '售后管理',
    items: [
      {
        path: '/storesync/refunds',
        title: '售后列表',
        desc: '状态卡片 · 时效 · 跟催',
        icon: 'refund-o',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
    ],
  },
]
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.storesync-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
