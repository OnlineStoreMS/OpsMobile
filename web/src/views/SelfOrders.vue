<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="自营订单" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="单号 / 关联销售单 / 买家"
        show-action
        @search="reload"
      >
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <div class="range-block">
        <template v-if="showDateFilter">
          <div class="range-hint">创建时间</div>
          <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />
        </template>
        <div v-else class="range-hint range-hint--plain">待发货：全部未发完单据（含部分发货）</div>
      </div>

      <div class="status-bar">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': activeTab === tab.key }"
          @click="onTabChange(tab.key)"
        >
          <span class="status-chip__label">{{ tab.label }}</span>
          <span v-if="tab.count != null" class="status-chip__n">{{ tab.count }}</span>
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
              <span class="ops-tag order-card__tag" :class="payTagClass(row.payStatus)">
                {{ labelSelfPayStatus(row.payStatus) }}
              </span>
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
            <div class="order-card__time">{{ formatTime(row.createdAt || row.orderedAt) }}</div>
            <van-button
              v-if="showShipBtn(row)"
              size="mini"
              type="primary"
              round
              @click.stop="openShip(row)"
            >
              打单发货
            </van-button>
            <van-icon v-else name="arrow" color="#9aabB6" />
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
import {
  formatOrderSource,
  formatTime,
  labelSelfDocStatus,
  labelSelfShipStatus,
  labelSelfPayStatus,
  deriveSelfShipStatus,
} from '../utils/labels'
import { toApiDateTimeRange, todayDay } from '../utils/dateRange'

type StatusTabKey =
  | 'all'
  | 'wait_ship'
  | 'shipped'
  | 'partial_shipped'
  | 'pay_unpaid'
  | 'pay_partial'
  | 'pay_paid'
  | 'ordered'
  | 'completed'
  | 'cancelled'

const router = useRouter()
const keyword = ref('')
/** 默认今天（创建时间） */
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

/** 待发货不看日期，拉全部未发完 */
const showDateFilter = computed(() => activeTab.value !== 'wait_ship')

const statusTabs = computed(() => {
  const by = counts.value.byStatus || {}
  const n = (k: string) => Number(by[k] || 0)
  const completed = n('completed')
  const cancelled = n('cancelled')
  const all = Number(counts.value.all || 0)
  const ordered = Math.max(0, all - completed - cancelled)
  return [
    { key: 'all' as const, label: '全部', count: all },
    { key: 'wait_ship' as const, label: '待发货', count: Number(counts.value.waitShip || 0) },
    { key: 'partial_shipped' as const, label: '部分发货', count: n('partial_shipped') },
    { key: 'shipped' as const, label: '已发货', count: n('shipped') + completed },
    { key: 'pay_unpaid' as const, label: '未付款', count: Number(counts.value.unpaid || 0) },
    { key: 'pay_partial' as const, label: '部分付款', count: null as number | null },
    { key: 'pay_paid' as const, label: '已付清', count: null as number | null },
    { key: 'ordered' as const, label: '已下单', count: ordered },
    { key: 'completed' as const, label: '已完成', count: completed },
    { key: 'cancelled' as const, label: '已取消', count: cancelled },
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

function payTagClass(pay?: string) {
  const s = (pay || 'unpaid').trim()
  if (s === 'paid') return 'ops-tag--ok'
  if (s === 'partial') return 'ops-tag--warn'
  return ''
}

function showShipBtn(row: SelfOrderListItem) {
  if (!(row.refSoId && row.refSoId > 0)) return false
  const ship = deriveSelfShipStatus(row.status)
  return ship === 'wait_ship' || ship === 'partial_shipped'
}

function openShip(row: SelfOrderListItem) {
  if (!row.refSoId) return
  router.push({
    path: `/ship/${row.refSoId}`,
    query: row.refTraceId ? { no: row.refTraceId } : undefined,
  })
}

/** 最新创建在前（对齐电脑端 created_at DESC） */
function sortNewestFirst(rows: SelfOrderListItem[]) {
  return [...rows].sort((a, b) => {
    const ta = Date.parse(a.createdAt || a.orderedAt || '') || 0
    const tb = Date.parse(b.createdAt || b.orderedAt || '') || 0
    if (tb !== ta) return tb - ta
    return (b.id || 0) - (a.id || 0)
  })
}

function listParams() {
  const base: Parameters<typeof listSelfOrders>[0] = {
    keyword: keyword.value.trim() || undefined,
    page: page.value,
    pageSize: 20,
  }
  // 待发货：不限创建时间，含部分发货
  if (activeTab.value !== 'wait_ship') {
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    base.createdAtStart = start
    base.createdAtEnd = end
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
    case 'pay_unpaid':
      base.payStatus = 'unpaid'
      base.excludeStatuses = 'cancelled'
      break
    case 'pay_partial':
      base.payStatus = 'partial'
      base.excludeStatuses = 'cancelled'
      break
    case 'pay_paid':
      base.payStatus = 'paid'
      base.excludeStatuses = 'cancelled'
      break
    case 'ordered':
      base.status = 'ordered'
      break
    case 'completed':
      base.status = 'completed'
      break
    case 'cancelled':
      base.status = 'cancelled'
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
    const kw = keyword.value.trim() || undefined
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    // 带日期：全部/付款等 Tab 数量；待发货数量单独不限日期
    const [data, waitAll] = await Promise.all([
      getSelfOrderStatusCounts({
        keyword: kw,
        createdAtStart: start,
        createdAtEnd: end,
      }),
      getSelfOrderStatusCounts({ keyword: kw }),
    ])
    counts.value = {
      all: Number(data?.all || 0),
      byStatus: data?.byStatus || {},
      waitShip: Number(waitAll?.waitShip || 0),
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
    list.value = sortNewestFirst(list.value.concat(rows))
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
  max-width: 62%;
}
.order-card__foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.order-card__time {
  margin-left: auto;
  font-size: 12px;
  color: var(--ops-muted);
  font-variant-numeric: tabular-nums;
}
.range-block {
  min-height: 44px;
}
.range-hint {
  padding: 0 16px 4px;
  font-size: 12px;
  color: var(--ops-muted);
  font-weight: 600;
}
.range-hint--plain {
  padding: 8px 16px 12px;
  line-height: 1.4;
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
  /* 上下留白，避免 overflow 裁切圆角/选中态 */
  padding: 6px 12px 14px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
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
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 999px;
  line-height: 1.2;
  -webkit-appearance: none;
  appearance: none;
  box-shadow: none;
  transform: none;
}
.status-chip__label {
  white-space: nowrap;
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
  color: var(--ops-primary);
  border-color: rgba(15, 118, 110, 0.35);
  background: var(--ops-primary-soft);
  box-shadow: none;
}
.status-chip--on .status-chip__n {
  background: rgba(15, 118, 110, 0.18);
  color: var(--ops-primary);
}
</style>
