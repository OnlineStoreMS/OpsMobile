<template>
  <div class="page home-page agents-home page--no-in">
    <HubHeader title="Agents 中心" tone="slate" />

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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import HubHeader from '../../components/HubHeader.vue'
import { agentsApi, canSendKeepAliveOtp, type DashboardStats } from '../../api/agents'

const router = useRouter()
const stats = ref<DashboardStats | null>(null)
const waitingOtp = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

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

async function load() {
  try {
    const [st, shops] = await Promise.all([
      agentsApi.fetchDashboardStats(),
      agentsApi.listShops({ page: 1, pageSize: 200 }),
    ])
    stats.value = st
    waitingOtp.value = (shops.list || []).filter(canSendKeepAliveOtp).length
  } catch {
    // 工作台数字失败时仍可进子页
  }
}

const sections = computed(() => [
  {
    title: '店铺保活',
    items: [
      {
        path: '/agents/keepalive',
        title: '填验证码',
        desc: waitingOtp.value ? `${waitingOtp.value} 个店铺待填短信验证码` : '登录失效时 Agent 发码，在此回填',
        count: waitingOtp.value ? String(waitingOtp.value) : '',
        icon: 'shield-o',
        gradient: 'linear-gradient(145deg, #9f1239, #e11d48)',
        glow: 'rgba(225, 29, 72, 0.3)',
      },
    ],
  },
  {
    title: '节点与会话',
    items: [
      {
        path: '/agents/nodes',
        title: '执行节点',
        desc: stats.value ? `在线 ${stats.value.agentOnline} / ${stats.value.agentTotal}` : 'Windows Agent',
        icon: 'desktop-o',
        gradient: 'linear-gradient(145deg, #1e3a5f, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.28)',
      },
      {
        path: '/agents/shops',
        title: '店铺会话',
        desc: stats.value ? `共 ${stats.value.shopTotal} 个会话` : '已登录店铺',
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
    ],
  },
  {
    title: '任务',
    items: [
      {
        path: '/agents/jobs',
        title: '任务订阅',
        desc: stats.value?.jobRunning ? `执行中 ${stats.value.jobRunning}` : '订阅与立即执行',
        icon: 'todo-list-o',
        gradient: 'linear-gradient(145deg, #78350f, #d97706)',
        glow: 'rgba(217, 119, 6, 0.28)',
      },
      {
        path: '/agents/jobs?tab=runs&status=pending',
        title: '待分配',
        desc: '排队中的执行单',
        count: stats.value?.jobPending ? String(stats.value.jobPending) : '',
        icon: 'clock-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
    ],
  },
])

onMounted(() => {
  void load()
  timer = setInterval(() => {
    void load()
  }, 8000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.hub-section {
  margin-bottom: 8px;
}
.agents-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
.tile-count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #e11d48;
}
</style>
