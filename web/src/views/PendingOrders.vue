<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待发货" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="订单号 / 收件人 / 手机"
        show-action
        @search="reload"
      >
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="status-bar">
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': filter === 'all' }"
          @click="onFilterChange('all')"
        >
          全部待发货
        </button>
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': filter === 'partial' }"
          @click="onFilterChange('partial')"
        >
          部分发货
        </button>
      </div>

      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="(row, idx) in list"
          :key="row.id"
          class="order-card"
          :style="{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }"
          @click="openDetail(row)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.orderNo }}</div>
            <div class="order-card__tags">
              <span
                class="ops-tag order-card__tag"
                :class="row.shipStatus === 'partial_shipped' ? 'ops-tag--warn' : 'ops-tag--warn'"
              >
                {{ labelShipStatus(row.shipStatus) || '待发货' }}
              </span>
              <span v-if="row.pendingPlanCount" class="ops-tag ops-tag--ok">
                已拆 {{ row.pendingPlanCount }} 段
              </span>
            </div>
          </div>

          <div class="receiver-box">
            <div class="receiver-box__name">
              <van-icon name="contact" />
              <strong>{{ receiverName(row) }}</strong>
              <span class="receiver-box__phone">{{ receiverPhone(row) }}</span>
            </div>
            <div class="receiver-box__addr">{{ receiverAddr(row) }}</div>
          </div>

          <div class="order-card__meta">
            <div>{{ formatOrderGoodsSummary(row) }}</div>
            <div>来源 <strong>{{ formatOrderSource(row) }}</strong></div>
          </div>
          <div class="order-card__foot">
            <div class="order-card__time">{{ formatTime(row.orderedAt || row.payTime) }}</div>
            <div class="order-card__actions" @click.stop>
              <van-button size="mini" plain round hairline type="primary" @click="openShip(row, true)">
                {{ row.pendingPlanCount ? '编辑拆分' : '拆分' }}
              </van-button>
              <van-button size="mini" type="primary" round @click="openShip(row)">
                打单发货
              </van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无待发货" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { listPendingOmsOrders, shippingApi, type OMSOrder } from '../api/shipping'
import { formatOrderSource, formatTime, labelShipStatus } from '../utils/labels'
import { formatOrderGoodsSummary, healShipPlanLines } from '../utils/sfOrderHandoff'

const route = useRoute()
const router = useRouter()
const keyword = ref('')
/** all = 待发货+部分发货；partial = 仅部分发货 */
const filter = ref<'all' | 'partial'>(route.query.tab === 'partial' ? 'partial' : 'all')
const list = ref<OMSOrder[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function receiverName(row: OMSOrder) {
  return row.buyerName || row.address?.name || '-'
}

function receiverPhone(row: OMSOrder) {
  return row.buyerPhone || row.address?.phone || ''
}

function receiverAddr(row: OMSOrder) {
  const a = row.address
  if (!a) return '暂无地址'
  return a.fullText || [a.province, a.city, a.district, a.address].filter(Boolean).join(' ') || '暂无地址'
}

function openDetail(row: OMSOrder) {
  router.push({
    path: `/pending/${row.id}`,
    query: row.orderNo ? { no: row.orderNo } : undefined,
  })
}

function openShip(row: OMSOrder, split?: boolean) {
  router.push({
    path: `/ship/${row.id}`,
    query: {
      ...(row.orderNo ? { no: row.orderNo } : {}),
      ...(split ? { split: '1' } : {}),
    },
  })
}

function onFilterChange(next: 'all' | 'partial') {
  if (filter.value === next) return
  filter.value = next
  void reload()
}

async function attachPendingPlanCounts(orders: OMSOrder[]) {
  const ids = orders.map((o) => o.id).filter((id) => id > 0)
  if (!ids.length) return
  try {
    const { counts } = await shippingApi.countPendingShipPlans(ids)
    for (const o of orders) {
      o.pendingPlanCount = counts[String(o.id)] || 0
      o.shipPlanLines = o.shipPlanLines || []
    }
    const needPlans = orders.filter(
      (o) => (o.pendingPlanCount || 0) > 0 || o.shipStatus === 'partial_shipped',
    )
    await Promise.all(
      needPlans.map(async (o) => {
        try {
          const { list: plans } = await shippingApi.getShipPlan(o.id)
          o.shipPlanLines = healShipPlanLines(o, plans || [])
          o.pendingPlanCount = (o.shipPlanLines || []).filter((l) => l.status === 'pending').length
        } catch {
          o.shipPlanLines = []
        }
      }),
    )
  } catch {
    /* optional */
  }
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
    const shipStatus = filter.value === 'partial' ? 'partial_shipped' : 'need_ship'
    const res = await listPendingOmsOrders({
      keyword: keyword.value.trim() || undefined,
      shipStatus,
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    await attachPendingPlanCounts(rows)
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
  /* van-list will trigger loadMore */
})
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
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 12px 10px;
}
.status-chip {
  border: 1px solid var(--ops-line);
  background: rgba(255, 255, 255, 0.88);
  color: var(--ops-muted);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 600;
}
.status-chip--on {
  border-color: var(--ops-primary);
  background: var(--ops-primary-soft);
  color: var(--ops-primary);
}
.receiver-box {
  margin: 2px 0 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(217, 119, 6, 0.06));
  border: 1px solid rgba(15, 118, 110, 0.1);
}
.receiver-box__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--ops-text);
}
.receiver-box__name strong {
  font-weight: 650;
}
.receiver-box__phone {
  color: var(--ops-muted);
  font-weight: 400;
  font-size: 13px;
}
.receiver-box__addr {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.order-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}
.order-card__actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
