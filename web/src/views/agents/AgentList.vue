<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="执行节点" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="load">刷新</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in list" :key="row.id" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.name || row.hostname || `节点 ${row.id}` }}</div>
            <van-tag plain :type="row.status === 'online' ? 'success' : 'default'">
              {{ row.status === 'online' ? '在线' : row.status || '离线' }}
            </van-tag>
          </div>
          <div class="muted">{{ row.hostname || '—' }} · {{ row.os || '—' }}</div>
          <div class="muted">版本 {{ row.agentVersion || '—' }} · 店铺 {{ row.shopCount || 0 }}</div>
          <div class="muted">心跳 {{ formatTime(row.lastHeartbeat) }}</div>
          <div v-if="shopsText(row) !== '—'" class="muted">{{ shopsText(row) }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无执行节点" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { agentsApi, type AgentItem } from '../../api/agents'
import { formatTime } from '../../utils/labels'

const router = useRouter()
const loading = ref(false)
const list = ref<AgentItem[]>([])

function shopsText(row: AgentItem) {
  const shops = row.shops || []
  if (!shops.length) return '—'
  return shops
    .map((s) => `${s.platformShopName || s.platformShopId}${s.browserChannel ? ` · ${s.browserChannel}` : ''}`)
    .join('；')
}

async function load() {
  loading.value = true
  try {
    const res = await agentsApi.listAgents({ page: 1, pageSize: 100 })
    list.value = res.list || []
  } catch (e: any) {
    showFailToast(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
}
</style>
