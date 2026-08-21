<template>
  <div class="page home-page supply-home page--no-in">
    <HubHeader title="供应链中心" tone="teal" />

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
  const q = path.indexOf('?')
  if (q < 0) {
    router.push(path)
    return
  }
  const query: Record<string, string> = {}
  new URLSearchParams(path.slice(q + 1)).forEach((v, k) => {
    query[k] = v
  })
  router.push({ path: path.slice(0, q), query })
}

const sections = [
  {
    title: '采购',
    items: [
      {
        path: '/supply/purchase-orders?fulfillmentType=dropship',
        title: '代发订单',
        desc: '合并 · 拆分 · 解密复制',
        icon: 'logistics',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
      {
        path: '/supply/purchase-orders?fulfillmentType=stock_in',
        title: '采购订单',
        desc: '入仓采购 · 到货跟进',
        icon: 'orders-o',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
      {
        path: '/supply/suppliers',
        title: '供应商',
        desc: '档案速查',
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #1d4e89, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.24)',
      },
    ],
  },
  {
    title: '收货入库',
    items: [
      {
        path: '/supply/scan-inbound',
        title: '包裹扫描',
        desc: '扫运单收包',
        icon: 'scan',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/supply/package-receives',
        title: '收货记录',
        desc: '收包流水',
        icon: 'logistics',
        gradient: 'linear-gradient(145deg, #7c3aed, #a78bfa)',
        glow: 'rgba(167, 139, 250, 0.28)',
      },
      {
        path: '/supply/inbounds',
        title: '采购入库单',
        desc: '入库单查询',
        icon: 'down',
        gradient: 'linear-gradient(145deg, #047857, #10b981)',
        glow: 'rgba(16, 185, 129, 0.26)',
      },
    ],
  },
]
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.supply-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
