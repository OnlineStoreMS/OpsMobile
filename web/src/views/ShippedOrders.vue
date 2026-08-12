<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="已发货" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="运单号 / 收件人 / 单号"
        show-action
        @search="reload"
      >
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="(row, idx) in list"
          :key="row.id"
          class="order-card"
          :style="{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }"
          @click="router.push(`/shipped/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.mailNo || row.sourceRef || `#${row.id}` }}</div>
            <span class="ops-tag ops-tag--ok order-card__tag">{{ shipStatusLabel(row.status) }}</span>
          </div>
          <div class="order-card__meta">
            <div>
              <strong>{{ row.receiverName || '-' }}</strong>
              {{ row.receiverMobile || '' }}
            </div>
            <div>{{ row.cargoName || row.items?.[0]?.goodsName || '-' }}</div>
            <div>来源 <strong>{{ formatOrderSource(row) }}</strong></div>
          </div>
          <div class="order-card__foot">
            <div class="order-card__time">{{ formatTime(row.printedAt || row.createdAt) }}</div>
            <van-icon name="arrow" color="#9aabB6" />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无已发货单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../components/DateRangeBar.vue'
import { listShipments, type Shipment } from '../api/shipping'
import { formatOrderSource, formatTime } from '../utils/labels'
import { toApiDateTimeRange, todayDay } from '../utils/dateRange'

const router = useRouter()
const keyword = ref('')
const rangeStart = ref(todayDay())
const rangeEnd = ref(todayDay())
const list = ref<Shipment[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function shipStatusLabel(v?: string) {
  if (!v) return '已发货'
  if (v === 'printed') return '已打单'
  if (v === 'shipped') return '已发货'
  if (v === 'pending') return '待发货'
  return v
}

function onRangeChange(payload: { start: string; end: string }) {
  rangeStart.value = payload.start
  rangeEnd.value = payload.end
  void reload()
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
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    const res = await listShipments({
      keyword: keyword.value.trim() || undefined,
      status: 'printed',
      printedAtStart: start,
      printedAtEnd: end,
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
