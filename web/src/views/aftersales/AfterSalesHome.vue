<template>
  <div class="page home-page aftersales-home page--no-in">
    <HubHeader title="售后中心" tone="rose" />

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
            <div class="title">
              {{ app.title }}
              <span v-if="app.count" class="tile-count">{{ app.count }}</span>
            </div>
            <div class="desc">{{ app.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HubHeader from '../../components/HubHeader.vue'
import { aftersalesApi, type NavCounts } from '../../api/aftersales'
import { badgeText } from '../../utils/ticketLogistics'

const router = useRouter()
const counts = ref<NavCounts | null>(null)

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

const sections = computed(() => [
  {
    title: '店铺管理',
    items: [
      {
        path: '/aftersales/shops',
        title: '店铺列表',
        desc: counts.value?.ticketTotal ? `待处理 ${badgeText(counts.value.ticketTotal)}` : '绑定 · 同步 · 工作台',
        count: badgeText(counts.value?.ticketTotal),
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #1e3a5f, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.28)',
      },
      {
        path: '/aftersales/tickets?kind=buyer-return-pickup',
        title: '待取件',
        desc: '买家退货待取件',
        count: badgeText(counts.value?.buyerReturnPickup),
        icon: 'logistics',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/aftersales/tickets?kind=review-shipped-refund',
        title: '已发货退款',
        desc: '待商家审核',
        count: badgeText(counts.value?.reviewShippedRefund),
        icon: 'balance-pay',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
    ],
  },
  {
    title: '退回管理',
    items: [
      {
        path: '/aftersales/intercept',
        title: '需商家拦截快递',
        desc: '拦截 + 发货待取件',
        count: badgeText(counts.value?.interceptOrders),
        icon: 'warning-o',
        gradient: 'linear-gradient(145deg, #9f1239, #e11d48)',
        glow: 'rgba(225, 29, 72, 0.28)',
      },
      {
        path: '/aftersales/tickets?kind=buyer-return-signed',
        title: '退货已签收',
        desc: '待商家收货',
        count: badgeText(counts.value?.buyerReturnSigned),
        icon: 'passed',
        gradient: 'linear-gradient(145deg, #b45309, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.26)',
      },
      {
        path: '/aftersales/shipped-success',
        title: '已发货退款成功',
        desc: '退款成功 · 物流跟踪',
        icon: 'completed',
        gradient: 'linear-gradient(145deg, #047857, #10b981)',
        glow: 'rgba(16, 185, 129, 0.26)',
      },
      {
        path: '/aftersales/return-refunds',
        title: '退货退款成功',
        desc: '近 30 日退货退款',
        icon: 'refund-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
      {
        path: '/aftersales/returns',
        title: '退回件',
        desc: '已退回包裹',
        icon: 'back-top',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
    ],
  },
  {
    title: '服务工单',
    items: [
      {
        path: '/aftersales/service-orders',
        title: '待处理',
        desc: '默认待处理',
        count: badgeText(counts.value?.pendingServiceOrders),
        icon: 'todo-list-o',
        gradient: 'linear-gradient(145deg, #be185d, #f43f5e)',
        glow: 'rgba(244, 63, 94, 0.28)',
      },
      {
        path: '/aftersales/service-orders?statusTab=处理中',
        title: '处理中',
        desc: '跟进中的工单',
        icon: 'play-circle-o',
        gradient: 'linear-gradient(145deg, #0369a1, #38bdf8)',
        glow: 'rgba(14, 165, 233, 0.26)',
      },
      {
        path: '/aftersales/service-orders?statusTab=已逾期',
        title: '已逾期',
        desc: '超时未处理',
        icon: 'clock-o',
        gradient: 'linear-gradient(145deg, #9f1239, #fb7185)',
        glow: 'rgba(251, 113, 133, 0.26)',
      },
    ],
  },
])

onMounted(async () => {
  try {
    counts.value = await aftersalesApi.fetchNavCounts()
  } catch {
    counts.value = null
  }
})
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.aftersales-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
.tile-count {
  display: inline-block;
  margin-left: 6px;
  padding: 0 7px;
  min-width: 1.4em;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
  color: #be123c;
  background: rgba(225, 29, 72, 0.1);
  border-radius: 999px;
  vertical-align: middle;
}
</style>
