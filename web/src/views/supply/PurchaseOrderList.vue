<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()">
      <template #right>
        <span v-if="isDropship" class="nav-action" @click="toggleSelectMode">{{ selectMode ? '取消' : '多选' }}</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="单号 / 供应商 / 销售单" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="range-block">
        <div class="range-hint">采购时间</div>
        <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />
      </div>

      <div class="status-bar">
        <button
          v-for="opt in PO_STATUS_OPTIONS"
          :key="opt.value || 'all'"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': statusFilter === opt.value }"
          @click="setStatus(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          :class="{ 'order-card--selected': selectedIds.has(row.id) }"
          @click="onCardClick(row)"
        >
          <div class="order-card__top">
            <div class="order-card__left">
              <van-checkbox
                v-if="selectMode"
                :model-value="selectedIds.has(row.id)"
                @click.stop
                @update:model-value="(v: boolean) => toggleSelect(row.id, v)"
              />
              <div class="order-card__no">{{ row.poNo }}</div>
            </div>
            <div class="order-card__tags">
              <van-tag plain type="primary">{{ labelPoStatus(row.status) }}</van-tag>
              <van-tag plain>{{ labelPayStatus(row.payStatus) }}</van-tag>
            </div>
          </div>

          <div class="goods-name">{{ row.supplierName || '-' }}</div>
          <div v-if="row.skuSpecs" class="specs-line">{{ row.skuSpecs }}</div>
          <div class="muted meta-line">
            <template v-if="isDropship && (row.refTraceId || row.refSoId)">
              销售单 {{ briefTrace(row) }} ·
            </template>
            {{ row.itemCount || 0 }} 行
            <template v-if="row.saleAmount"> · 销售 ¥{{ Number(row.saleAmount).toFixed(2) }}</template>
          </div>

          <div class="card-foot">
            <span class="muted">{{ formatTime(row.orderedAt || row.createdAt) }}</span>
            <div class="card-foot__right" @click.stop>
              <span class="amt">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</span>
              <template v-if="isDropship && !selectMode">
                <van-button size="mini" plain hairline round type="warning" @click="decryptRow(row)">解密</van-button>
                <van-button size="mini" plain hairline round @click="copyRow(row)">复制</van-button>
              </template>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" :description="emptyText" />
      </van-list>
    </div>

    <div v-if="selectMode && isDropship" class="batch-bar footer-safe">
      <div class="batch-bar__info">已选 {{ selectedIds.size }}</div>
      <van-button size="small" type="primary" round :disabled="!canMerge" :loading="merging" @click="doMerge">
        合并代发单
      </van-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import {
  labelPayStatus,
  labelPoStatus,
  PO_STATUS_OPTIONS,
  supplyApi,
  type PurchaseOrderListItem,
} from '../../api/supply'
import {
  buildMultiOrderCopyText,
  canDecryptOrder,
  isMaskedReceiver,
} from '../../utils/supplyOrderCopy'
import { copyToClipboard } from '../../utils/clipboard'
import { daysAgo, toApiDateTimeRange, todayDay } from '../../utils/dateRange'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<PurchaseOrderListItem[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const rangeStart = ref(daysAgo(6))
const rangeEnd = ref(todayDay())
const statusFilter = ref('')
const selectMode = ref(false)
const selectedIds = ref<Set<number>>(new Set())
const merging = ref(false)

const fulfillmentType = computed(() => {
  const t = route.query.fulfillmentType
  return typeof t === 'string' && t ? t : ''
})

const isDropship = computed(() => fulfillmentType.value === 'dropship')

const navTitle = computed(() => {
  if (fulfillmentType.value === 'dropship') return '代发订单'
  if (fulfillmentType.value === 'stock_in') return '采购订单'
  return '供应商订单'
})

const emptyText = computed(() =>
  fulfillmentType.value === 'dropship' ? '暂无代发单' : '暂无采购单',
)

const selectedRows = computed(() => list.value.filter((r) => selectedIds.value.has(r.id)))

const canMerge = computed(() => {
  const rows = selectedRows.value
  if (rows.length < 2) return false
  if (!rows.every((r) => isMergeable(r))) return false
  const sid = rows[0]?.supplierId
  return rows.every((r) => r.supplierId === sid)
})

function isMergeable(row: PurchaseOrderListItem) {
  if (row.fulfillmentType !== 'dropship') return false
  if (row.payStatus === 'paid' || row.payStatus === 'partial') return false
  if (!(row.refSoId && row.refSoId > 0) && !row.refTraceId?.trim()) return false
  return true
}

function briefTrace(row: PurchaseOrderListItem) {
  const t = (row.refTraceId || '').trim()
  if (t) {
    const parts = t.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length <= 2) return parts.join('、')
    return `${parts[0]} 等${parts.length}单`
  }
  return row.refSoId ? `#${row.refSoId}` : ''
}

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

function setStatus(v: string) {
  statusFilter.value = v
  reload()
}

function onRangeChange(payload: { start: string; end: string }) {
  rangeStart.value = payload.start
  rangeEnd.value = payload.end
  reload()
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selectedIds.value = new Set()
}

function toggleSelect(id: number, on: boolean) {
  const next = new Set(selectedIds.value)
  if (on) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function onCardClick(row: PurchaseOrderListItem) {
  if (selectMode.value) {
    toggleSelect(row.id, !selectedIds.value.has(row.id))
    return
  }
  router.push(`/supply/purchase-orders/${row.id}`)
}

async function loadLinkedOrders(poId: number) {
  const po = await supplyApi.getPurchaseOrder(poId)
  const ids = new Set<number>()
  if (po.refSoId && po.refSoId > 0) ids.add(po.refSoId)
  for (const it of po.items || []) {
    if (it.refSoId && it.refSoId > 0) ids.add(it.refSoId)
  }
  if (!ids.size) throw new Error('未关联销售订单')
  const orders = []
  for (const id of ids) {
    orders.push(await supplyApi.fetchOrder(id))
  }
  return orders
}

async function decryptRow(row: PurchaseOrderListItem) {
  try {
    const orders = await loadLinkedOrders(row.id)
    const ecommerce = orders.filter((o) => canDecryptOrder(o))
    if (!ecommerce.length) {
      showFailToast('无可解密的电商订单')
      return
    }
    const data = await supplyApi.decryptOrders(ecommerce.map((o) => o.id))
    showSuccessToast(data.success > 1 ? `已解密 ${data.success} 笔` : '解密成功')
  } catch (e: any) {
    showFailToast(e.message || '解密失败')
  }
}

async function copyRow(row: PurchaseOrderListItem) {
  try {
    let orders = await loadLinkedOrders(row.id)
    const need = orders.filter((o) => canDecryptOrder(o) && isMaskedReceiver(o))
    if (need.length) {
      const data = await supplyApi.decryptOrders(need.map((o) => o.id))
      const byId = new Map((data.items || []).map((o) => [o.id, o]))
      orders = orders.map((o) => byId.get(o.id) || o)
    }
    const text = buildMultiOrderCopyText(orders)
    if (!text.trim()) {
      showFailToast('暂无收件信息可复制')
      return
    }
    const ok = await copyToClipboard(text)
    if (ok) {
      showSuccessToast(orders.length > 1 ? `已复制 ${orders.length} 笔（已标序号）` : '已复制')
    } else {
      showFailToast('复制失败')
    }
  } catch (e: any) {
    showFailToast(e.message || '复制失败')
  }
}

async function doMerge() {
  if (!canMerge.value) {
    showFailToast('请选择同供应商、已关联销售单、未付款的代发单')
    return
  }
  const rows = selectedRows.value
  const nos = rows.map((r) => r.poNo).join('、')
  try {
    await showConfirmDialog({
      title: '合并代发单',
      message: `将合并为第一张：${nos}`,
    })
  } catch {
    return
  }
  merging.value = true
  try {
    const ids = rows.map((r) => r.id)
    const result = await supplyApi.mergePOs({ sourcePoIds: ids, targetPoId: ids[0] })
    showSuccessToast(`已合并为 ${result.poNo}`)
    selectMode.value = false
    selectedIds.value = new Set()
    reload()
  } catch (e: any) {
    showFailToast(e.message || '合并失败')
  } finally {
    merging.value = false
  }
}

async function loadMore() {
  loading.value = true
  try {
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    const res = await supplyApi.listPurchaseOrders({
      keyword: keyword.value.trim() || undefined,
      fulfillmentType: fulfillmentType.value || undefined,
      status: statusFilter.value || undefined,
      orderedAtStart: keyword.value.trim() ? undefined : start,
      orderedAtEnd: keyword.value.trim() ? undefined : end,
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 20) finished.value = true
    else page.value += 1
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  void loadMore()
}

watch(
  () => route.query.fulfillmentType,
  () => {
    selectMode.value = false
    selectedIds.value = new Set()
    statusFilter.value = ''
    reload()
  },
)
</script>

<style scoped>
.nav-action {
  font-size: 14px;
  color: var(--ops-primary);
  padding: 0 4px;
}
.range-block {
  padding-top: 4px;
}
.range-hint {
  font-size: 12px;
  color: var(--ops-muted);
  padding: 0 16px 2px;
}
.status-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 4px 12px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.status-bar::-webkit-scrollbar {
  display: none;
}
.status-chip {
  flex: 0 0 auto;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.status-chip--on {
  color: var(--ops-primary);
  border-color: rgba(15, 118, 110, 0.35);
  background: var(--ops-primary-soft);
}
.order-card--selected {
  border-color: rgba(15, 118, 110, 0.45);
  box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.2);
}
.order-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.order-card__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.order-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}
.specs-line {
  font-size: 12px;
  color: var(--ops-ink-soft);
  margin: 4px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.meta-line {
  font-size: 12px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
}
.card-foot__right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.amt {
  font-weight: 700;
}
.batch-bar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px calc(10px + var(--ops-safe-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid var(--ops-line);
}
.batch-bar__info {
  font-size: 12px;
  color: var(--ops-muted);
  margin-right: auto;
}
</style>
