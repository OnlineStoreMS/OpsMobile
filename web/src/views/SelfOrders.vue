<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="自营订单" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="订单号 / 买家 / 手机"
        show-action
        @search="reload"
      >
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="(row, idx) in list"
          :key="row.id"
          class="order-card"
          :style="{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }"
          @click="router.push(`/self-orders/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ orderNo(row) }}</div>
            <span class="ops-tag order-card__tag">{{ labelSelfStatus(row.status) }}</span>
          </div>
          <div class="order-card__meta">
            <div>来源 <strong>{{ formatOrderSource(row) }}</strong></div>
            <div>{{ row.skuSpecs || `${row.itemCount || 0} 件商品` }}</div>
          </div>
          <div class="order-card__foot">
            <div class="order-card__price">¥{{ Number(row.saleAmount || 0).toFixed(2) }}</div>
            <van-icon name="arrow" color="#9aabB6" />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无自营订单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { listSelfOrders, type SelfOrderListItem } from '../api/selfOrder'
import { formatOrderSource, labelSelfStatus } from '../utils/labels'

const router = useRouter()
const keyword = ref('')
const list = ref<SelfOrderListItem[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function orderNo(row: SelfOrderListItem) {
  return (row.refTraceId || '').trim() || row.soNo || '-'
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

<style scoped>
.order-card {
  animation: page-in 0.35s ease both;
}
.search-action {
  color: var(--ops-primary);
  font-weight: 600;
  padding: 0 4px;
}
</style>
