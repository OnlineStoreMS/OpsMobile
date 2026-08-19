<template>
  <div class="page home-page order-home page--no-in">
    <HubHeader title="订单中心" tone="slate" />

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
    title: '订单查询',
    items: [
      {
        path: '/order/orders',
        title: '全部订单',
        desc: '发货 · 类型 · 时间筛选',
        icon: 'orders-o',
        gradient: 'linear-gradient(145deg, #1e3a5f, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.28)',
      },
      {
        path: '/order/orders?status=pending_alloc',
        title: '待分配',
        desc: '分配 · 批量代发',
        icon: 'todo-list-o',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/order/orders?status=allocated',
        title: '已分配',
        desc: '撤回 · 发货跟催',
        icon: 'passed',
        gradient: 'linear-gradient(145deg, #047857, #10b981)',
        glow: 'rgba(16, 185, 129, 0.26)',
      },
    ],
  },
  {
    title: '快捷入口',
    items: [
      {
        path: '/manual-create',
        title: '新建手工单',
        desc: '识别地址 · 一键提交',
        icon: 'edit',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
    ],
  },
]
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.order-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
