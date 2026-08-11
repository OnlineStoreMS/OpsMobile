<template>
  <div class="page">
    <van-nav-bar title="自营订单" left-arrow @click-left="router.back()" />
    <van-search v-model="keyword" placeholder="单号/买家/手机" show-action @search="reload">
      <template #action>
        <div @click="reload">搜索</div>
      </template>
    </van-search>
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
      <div
        v-for="row in list"
        :key="row.id"
        class="card"
        style="cursor: pointer"
        @click="router.push(`/self-orders/${row.id}`)"
      >
        <div class="list-item-title">
          {{ row.soNo }}
          <van-tag plain type="primary" style="margin-left: 6px">{{ row.status }}</van-tag>
        </div>
        <div class="list-item-meta">
          <div>OMS {{ row.refTraceId || '-' }} · ¥{{ Number(row.saleAmount || 0).toFixed(2) }}</div>
          <div>{{ row.shopName || '-' }} · {{ row.skuSpecs || `${row.itemCount || 0} 件` }}</div>
          <div>{{ formatTime(row.orderedAt || row.createdAt) }}</div>
        </div>
      </div>
      <van-empty v-if="!loading && !list.length" description="暂无订单" />
    </van-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { listSelfOrders, type SelfOrderListItem } from '../api/selfOrder'

const router = useRouter()
const keyword = ref('')
const list = ref<SelfOrderListItem[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

async function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  await loadMore()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await listSelfOrders({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    list.value.push(...rows)
    if (list.value.length >= (res.total || 0) || rows.length < 20) {
      finished.value = true
    } else {
      page.value += 1
    }
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}
</script>
