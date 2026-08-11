<template>
  <div class="page">
    <van-nav-bar title="手机端应用中心" />
    <div class="page-body">
      <div class="card" v-if="userLabel">
        <div style="font-weight: 600">{{ userLabel }}</div>
        <div class="muted" style="margin-top: 4px">常用操作 · 轻量版</div>
      </div>

      <div class="grid-apps">
        <div
          v-for="app in apps"
          :key="app.path"
          class="grid-app"
          @click="router.push(app.path)"
        >
          <div class="icon-wrap" :style="{ background: app.color }">
            <van-icon :name="app.icon" />
          </div>
          <div class="title">{{ app.title }}</div>
          <div class="desc">{{ app.desc }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchSession } from '../utils/auth'

const router = useRouter()
const userLabel = ref('')

const apps = [
  { path: '/manual-create', title: '新建手工单', desc: '建单并选打单方式', icon: 'orders-o', color: '#1a73e8' },
  { path: '/self-orders', title: '自营订单', desc: '查询自营单状态', icon: 'shop-o', color: '#0d9488' },
  { path: '/pending', title: '待发货', desc: '发货中心待发货', icon: 'logistics', color: '#ea580c' },
  { path: '/shipped', title: '已发货', desc: '已打单/已出单', icon: 'completed', color: '#16a34a' },
]

onMounted(async () => {
  const s = await fetchSession()
  if (s) {
    userLabel.value = `${s.user.displayName || s.user.email} · ${s.tenant.name}`
  }
})
</script>
