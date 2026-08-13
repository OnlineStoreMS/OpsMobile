<template>
  <div class="page home-page material-home page--no-in">
    <HubHeader title="素材中心" tone="amber" />

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
    title: '素材库',
    items: [
      {
        path: '/material/materials',
        title: '全部素材',
        desc: '浏览 · 搜索',
        icon: 'photo-o',
        gradient: 'linear-gradient(145deg, #b45309, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/material/materials?mediaType=image',
        title: '图片',
        desc: '仅图片素材',
        icon: 'photograph',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
      {
        path: '/material/materials?mediaType=video',
        title: '视频',
        desc: '仅视频素材',
        icon: 'video-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
    ],
  },
  {
    title: '分类',
    items: [
      {
        path: '/material/categories',
        title: '素材分类',
        desc: '分类树速览',
        icon: 'cluster-o',
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
.material-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
