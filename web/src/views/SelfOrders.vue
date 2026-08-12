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
      <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />

      <div class="status-bar">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': activeTab === tab.key }"
          @click="onTabChange(tab.key)"
        >
          {{ tab.label }}
          <span class="status-chip__n">{{ tab.count }}</span>
        </button>
      </div>

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
            <div class="order-card__tags">
              <span class="ops-tag order-card__tag">{{ labelSelfDocStatus(row.status) }}</span>
              <span
                v-if="labelSelfShipStatus(row.status)"
                class="ops-tag order-card__tag"
                :class="shipTagClass(row.status)"
              >{{ labelSelfShipStatus(row.status) }}</span>
            </div>
          </div>
          <div class="receiver-line">
            <van-icon name="contact" />
            <strong>{{ row.buyerName || '-' }}</strong>
            <span v-if="row.buyerPhone" class="receiver-line__phone">{{ row.buyerPhone }}</span>
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../components/DateRangeBar.vue'
import {
  getSelfOrderStatusCounts,
  listSelfOrders,
  type SelfOrderListItem,
  type SelfOrderStatusCounts,
} from '../api/selfOrder'
import { formatOrderSource, labelSelfDocStatus, labelSelfShipStatus, deriveSelfShipStatus } from '../utils/labels'
import { toApiDateTimeRange, todayDay } from '../utils/dateRange'

type StatusTabKey =
  | 'all'
  | 'wait_ship'
  | 'shipped'
  | 'partial_shipped'
  | 'unpaid'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'draft'

const router = useRouter()
const keyword = ref('')
const rangeStart = ref(todayDay())
const rangeEnd = ref(todayDay())
const activeTab = ref<StatusTabKey>('all')
const counts = ref<SelfOrderStatusCounts>({
  all: 0,
  byStatus: {},
  waitShip: 0,
  unpaid: 0,
})
const list = ref<SelfOrderListItem[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const statusTabs = computed(() => {
  const by = counts.value.byStatus || {}
  const n = (k: string) => Number(by[k] || 0)
  // 发货态：全部之后按 待发货 → 已发货 → 部分发货（对齐电脑端发货筛选语义）
  return [
    { key: 'all' as const, label: '全部', count: Number(counts.value.all || 0) },
    { key: 'wait_ship' as const, label: '待发货', count: Number(counts.value.waitShip || 0) },
    { key: 'shipped' as const, label: '已发货', count: n('shipped') + n('completed') },
    { key: 'partial_shipped' as const, label: '部分发货', count: n('partial_shipped') },
    { key: 'unpaid' as const, label: '待付款', count: Number(counts.value.unpaid || 0) },
    { key: 'paid' as const, label: '已付款', count: n('paid') + n('partial_shipped') + n('shipped') },
    { key: 'completed' as const, label: '已完成', count: n('completed') },
    { key: 'cancelled' as const, label: '已取消', count: n('cancelled') },
    { key: 'draft' as const, label: '草稿', count: n('draft') },
  ]
})

function orderNo(row: SelfOrderListItem) {
  return (row.refTraceId || '').trim() || row.soNo || '-'
}

function shipTagClass(status?: string) {
  const ship = deriveSelfShipStatus(status)
  if (ship === 'shipped') return 'ops-tag--ok'
  if (ship === 'partial_shipped' || ship === 'wait_ship') return 'ops-tag--warn'
  return ''
}

function listParams() {
  const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
  const base: Parameters<typeof listSelfOrders>[0] = {
    keyword: keyword.value.trim() || undefined,
    orderedAtStart: start,
    orderedAtEnd: end,
    page: page.value,
    pageSize: 20,
  }
  switch (activeTab.value) {
    case 'wait_ship':
      base.shipStatus = 'wait_ship'
      break
    case 'shipped':
      base.shipStatus = 'shipped'
      break
    case 'partial_shipped':
      base.shipStatus = 'partial_shipped'
      break
    case 'unpaid':
      base.payStatus = 'unpaid,partial'
      base.excludeStatuses = 'draft,cancelled'
      break
    case 'paid':
      // 电脑端「已付款」含部分发货/已发货
      base.status = 'paid'
      break
    case 'completed':
      base.status = 'completed'
      break
    case 'cancelled':
      base.status = 'cancelled'
      break
    case 'draft':
      base.status = 'draft'
      break
    default:
      break
  }
  return base
}

function onRangeChange(payload: { start: string; end: string }) {
  rangeStart.value = payload.start
  rangeEnd.value = payload.end
  void reload()
}

function onTabChange(key: StatusTabKey) {
  if (activeTab.value === key) return
  activeTab.value = key
  void reload()
}

async function refreshCounts() {
  try {
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    const data = await getSelfOrderStatusCounts({
      keyword: keyword.value.trim() || undefined,
      orderedAtStart: start,
      orderedAtEnd: end,
    })
    counts.value = {
      all: Number(data?.all || 0),
      byStatus: data?.byStatus || {},
      waitShip: Number(data?.waitShip || 0),
      unpaid: Number(data?.unpaid || 0),
    }
  } catch {
    // 数量失败不阻断列表
  }
}

async function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  await Promise.all([refreshCounts(), loadMore()])
}

async function loadMore() {
  loading.value = true
  try {
    const res = await listSelfOrders(listParams())
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

onMounted(() => {
  void refreshCounts()
})
</script>

<style scoped>
.order-card {
  animation: page-in 0.35s ease both;
}
.order-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  max-width: 58%;
}
.search-action {
  color: var(--ops-primary);
  font-weight: 600;
  padding: 0 4px;
}
.receiver-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 8px;
  font-size: 14px;
  color: var(--ops-text);
}
.receiver-line strong {
  font-weight: 650;
}
.receiver-line__phone {
  color: var(--ops-muted);
  font-size: 13px;
  font-weight: 400;
}
.status-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 0 12px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.status-bar::-webkit-scrollbar {
  display: none;
}
.status-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: rgba(255, 255, 255, 0.78);
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px 6px 12px;
  border-radius: 999px;
  line-height: 1.2;
}
.status-chip__n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(15, 31, 42, 0.08);
  color: var(--ops-ink);
}
.status-chip--on {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}
.status-chip--on .status-chip__n {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
</style>
