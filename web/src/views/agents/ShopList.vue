<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="店铺会话" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="load">刷新</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in list" :key="row.id" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.platformShopName || row.platformShopId || '未命名店铺' }}</div>
            <van-tag plain :type="row.agentOnline ? 'success' : 'default'">
              {{ row.agentOnline ? '在线' : '离线' }}
            </van-tag>
          </div>
          <div class="muted">{{ platformLabel(row.platform) }} · ID {{ row.platformShopId || '—' }}</div>
          <div class="muted">手机号 {{ row.shopPhone || '—' }} · {{ row.browserChannel || '浏览器未报' }}</div>
          <div class="muted">节点 {{ row.agentName || '—' }} · 会话 {{ row.status || '—' }}</div>
          <div class="muted">最近上报 {{ formatTime(row.lastSeenAt) }}</div>
          <div v-if="row.keepAliveHint" class="hint">{{ row.keepAliveHint }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无店铺会话" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { agentsApi, platformLabel, type ShopItem } from '../../api/agents'
import { formatTime } from '../../utils/labels'

const router = useRouter()
const loading = ref(false)
const list = ref<ShopItem[]>([])

async function load() {
  loading.value = true
  try {
    const res = await agentsApi.listShops({ page: 1, pageSize: 200 })
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
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: #e11d48;
}
</style>
