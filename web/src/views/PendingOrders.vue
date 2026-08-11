<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待发货" left-arrow @click-left="router.back()" />
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
          @click="router.push(`/pending/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.orderNo }}</div>
            <span class="ops-tag ops-tag--warn order-card__tag">
              {{ labelShipStatus(row.shipStatus) || '待发货' }}
            </span>
          </div>
          <div class="order-card__meta">
            <div>
              <strong>{{ row.buyerName || row.address?.name || '-' }}</strong>
              {{ row.buyerPhone || row.address?.phone || '' }}
            </div>
            <div>{{ formatSpecLine(row.items) }}</div>
            <div>来源 <strong>{{ formatOrderSource(row) }}</strong></div>
          </div>
          <div class="order-card__foot">
            <div class="order-card__time">{{ formatTime(row.orderedAt || row.payTime) }}</div>
            <van-icon name="arrow" color="#9aabB6" />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无待发货" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { listPendingOmsOrders, type OMSOrder } from '../api/shipping'
import { formatOrderSource, formatSpecLine, formatTime, labelShipStatus } from '../utils/labels'

const router = useRouter()
const keyword = ref('')
const list = ref<OMSOrder[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  await loadMore()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await listPendingOmsOrders({
      keyword: keyword.value.trim() || undefined,
      shipStatus: 'wait_ship',
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
