<template>
  <div class="page home-page todo-home page--no-in">
    <HubHeader title="待办中心" tone="rose" />

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
    title: '待办',
    items: [
      {
        path: '/todo/todos',
        title: '全部待办',
        desc: '列表 · 搜索',
        icon: 'todo-list-o',
        gradient: 'linear-gradient(145deg, #be185d, #f43f5e)',
        glow: 'rgba(244, 63, 94, 0.28)',
      },
      {
        path: '/todo/todos?status=pending',
        title: '待处理',
        desc: '未开始',
        icon: 'clock-o',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/todo/todos?status=in_progress',
        title: '进行中',
        desc: '处理中',
        icon: 'play-circle-o',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
      {
        path: '/todo/todos?recurrence=monthly',
        title: '月待办',
        desc: '固定循环',
        icon: 'calendar-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
    ],
  },
  {
    title: '分类',
    items: [
      {
        path: '/todo/categories',
        title: '待办分类',
        desc: '电商 · 发货…',
        icon: 'apps-o',
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
.todo-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
