<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-action" @click="toggleSelectMode">{{ selectMode ? '取消' : '多选' }}</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="订单号 / 手机号 / 买家" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="range-block">
        <div class="range-hint">下单时间</div>
        <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />
      </div>

      <div class="filter-block">
        <div class="status-bar">
          <button
            v-for="opt in shipTabs"
            :key="'ship-' + opt.value"
            type="button"
            class="status-chip"
            :class="{ 'status-chip--on': shipStatus === opt.value }"
            @click="setShipStatus(opt.value)"
          >
            <span>{{ opt.label }}</span>
            <span v-if="showFilterCounts && shipCountOf(opt.value) != null" class="chip-count">
              {{ shipCountOf(opt.value) }}
            </span>
          </button>
        </div>
        <div class="status-bar">
          <button
            v-for="opt in typeTabs"
            :key="'type-' + opt.value"
            type="button"
            class="status-chip"
            :class="{ 'status-chip--on': sourceChannel === opt.value }"
            @click="setSourceChannel(opt.value)"
          >
            <span>{{ opt.label }}</span>
            <span v-if="showFilterCounts && typeCountOf(opt.value) != null" class="chip-count">
              {{ typeCountOf(opt.value) }}
            </span>
          </button>
        </div>
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
              <div class="order-card__no">{{ row.orderNo }}</div>
            </div>
            <div class="order-card__tags">
              <van-tag plain type="primary">{{ labelOrderStatus(row.status) }}</van-tag>
              <van-tag v-if="row.shipStatus" plain>{{ labelShipStatus(row.shipStatus) }}</van-tag>
            </div>
          </div>

          <div class="goods-preview" v-if="rootItems(row).length">
            <div v-for="it in rootItems(row).slice(0, 3)" :key="it.id || it.skuCode" class="goods-preview__row">
              <img v-if="it.picUrl" :src="it.picUrl" alt="" />
              <div class="goods-preview__info">
                <div class="goods-preview__title">{{ listItemTitle(it) }}</div>
                <div class="muted" v-if="listItemMeta(it).spec">{{ listItemMeta(it).spec }}</div>
                <div class="muted">×{{ it.quantity }}</div>
              </div>
            </div>
            <div v-if="rootItems(row).length > 3" class="muted more-goods">
              等 {{ rootItems(row).length }} 种商品
            </div>
          </div>

          <div class="receiver-line">{{ formatAddress(row.address) }}</div>
          <div v-if="canDecryptOrder(row)" class="addr-actions" @click.stop>
            <van-button
              v-if="isMaskedReceiver(row)"
              size="mini"
              plain
              hairline
              round
              type="warning"
              :loading="decryptRow[row.id]"
              @click="decryptOne(row)"
            >
              解密
            </van-button>
            <van-button
              v-else
              size="mini"
              plain
              hairline
              round
              type="primary"
              @click="copyOrderText(row)"
            >
              复制
            </van-button>
            <van-button
              v-if="!isMaskedReceiver(row)"
              size="mini"
              plain
              hairline
              round
              type="warning"
              :loading="decryptRow[row.id]"
              @click="decryptOne(row)"
            >
              重新解密
            </van-button>
          </div>
          <div class="muted meta-line">
            {{ labelSourceChannel(row.sourceChannel) }}
            <template v-if="row.shopName || row.platform"> · {{ row.shopName || row.platform }}</template>
            <template v-if="row.allocType"> · {{ labelAllocType(row.allocType) }}</template>
            <template v-if="row.supplierName"> · {{ row.supplierName }}</template>
          </div>
          <div class="card-foot">
            <span class="muted">{{ formatTime(row.orderedAt || row.createdAt) }}</span>
            <div class="card-foot__right" @click.stop>
              <span class="amt" v-if="row.payAmount != null">¥{{ Number(row.payAmount).toFixed(2) }}</span>
              <van-button
                v-if="!selectMode && canQuickAlloc(row)"
                size="mini"
                type="primary"
                round
                @click="quickAlloc(row)"
              >
                分配
              </van-button>
              <van-button
                v-if="!selectMode && canQuickRevoke(row)"
                size="mini"
                plain
                hairline
                type="warning"
                round
                @click="quickRevoke(row)"
              >
                撤回
              </van-button>
              <van-button
                v-if="!selectMode && canGoShip(row)"
                size="mini"
                type="primary"
                plain
                hairline
                round
                @click="goShip(row)"
              >
                发货
              </van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无订单" />
      </van-list>
    </div>

    <div v-if="selectMode" class="batch-bar footer-safe">
      <div class="batch-bar__info">已选 {{ selectedIds.size }}</div>
      <van-button size="small" plain round :disabled="!selectedIds.size" @click="batchDecrypt">解密</van-button>
      <van-button
        v-if="statusFilter === 'pending_alloc' || !statusFilter"
        size="small"
        type="primary"
        round
        :disabled="!selectedIds.size"
        @click="openBatchDropship"
      >
        批量代发
      </van-button>
      <van-button
        v-if="statusFilter === 'pending_alloc' || !statusFilter"
        size="small"
        type="primary"
        plain
        round
        :disabled="!selectedIds.size"
        @click="batchSelfShip"
      >
        批量自营
      </van-button>
      <van-button
        v-if="statusFilter === 'allocated' || !statusFilter"
        size="small"
        type="warning"
        plain
        round
        :disabled="!selectedIds.size"
        @click="batchRevoke"
      >
        批量撤回
      </van-button>
    </div>

    <!-- 单条快速分配 -->
    <van-action-sheet v-model:show="allocSheetVisible" title="分配履约" :closeable="true">
      <div class="sheet-body">
        <div class="sheet-label">履约方式</div>
        <van-radio-group v-model="allocForm.allocType" direction="horizontal">
          <van-radio name="self_ship">自营发货</van-radio>
          <van-radio name="dropship">供应商代发</van-radio>
        </van-radio-group>
        <template v-if="allocForm.allocType === 'dropship'">
          <div class="sheet-label">供应商</div>
          <van-field
            v-model="supplierKeyword"
            placeholder="搜索供应商"
            clearable
            @update:model-value="filterSuppliers"
          />
          <div class="supplier-list">
            <div
              v-for="s in filteredSuppliers"
              :key="s.id"
              class="supplier-item"
              :class="{ 'supplier-item--on': allocForm.supplierId === s.id }"
              @click="pickSupplier(s)"
            >
              {{ s.name }}
            </div>
            <van-empty v-if="!filteredSuppliers.length" description="无供应商" image-size="48" />
          </div>
        </template>
        <van-button block type="primary" round :loading="allocSubmitting" @click="submitAlloc">确认分配</van-button>
      </div>
    </van-action-sheet>

    <!-- 批量代发选供应商 -->
    <van-action-sheet v-model:show="batchDropVisible" title="批量代发" :closeable="true">
      <div class="sheet-body">
        <van-field v-model="supplierKeyword" placeholder="搜索供应商" clearable @update:model-value="filterSuppliers" />
        <div class="supplier-list">
          <div
            v-for="s in filteredSuppliers"
            :key="s.id"
            class="supplier-item"
            :class="{ 'supplier-item--on': batchSupplierId === s.id }"
            @click="batchSupplierId = s.id; batchSupplierName = s.name"
          >
            {{ s.name }}
          </div>
        </div>
        <van-button block type="primary" round :loading="allocSubmitting" @click="submitBatchDropship">
          确认代发（{{ selectedIds.size }} 单）
        </van-button>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import {
  labelAllocType,
  labelOrderStatus,
  labelShipStatus,
  labelSourceChannel,
  omsApi,
  ORDER_TYPE_OPTIONS,
  SHIP_STATUS_OPTIONS,
  type OmsOrder,
  type OmsSupplier,
} from '../../api/oms'
import { listItemMeta, listItemTitle, listOrderRootItems } from '../../utils/orderItemTree'
import { copyToClipboard } from '../../utils/clipboard'
import {
  buildOrderCopyText,
  canDecryptOrder,
  formatAddress,
  isMaskedReceiver,
} from '../../utils/orderCopy'
import { daysAgo, toApiDateTimeRange, todayDay } from '../../utils/dateRange'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<OmsOrder[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const rangeStart = ref(daysAgo(6))
const rangeEnd = ref(todayDay())
const shipStatus = ref('')
const sourceChannel = ref('')
const selectMode = ref(false)
const selectedIds = ref<Set<number>>(new Set())

const suppliers = ref<OmsSupplier[]>([])
const filteredSuppliers = ref<OmsSupplier[]>([])
const supplierKeyword = ref('')
const allocSheetVisible = ref(false)
const batchDropVisible = ref(false)
const allocSubmitting = ref(false)
const allocTarget = ref<OmsOrder | null>(null)
const allocForm = reactive({
  allocType: 'dropship' as 'self_ship' | 'dropship',
  supplierId: 0,
  supplierName: '',
})
const batchSupplierId = ref(0)
const batchSupplierName = ref('')
const decryptRow = reactive<Record<number, boolean>>({})
const shipCounts = ref<Record<string, number>>({})
const typeCounts = ref<Record<string, number>>({})

const statusFilter = computed(() => {
  const s = route.query.status
  return typeof s === 'string' && s ? s : ''
})

const navTitle = computed(() => {
  if (statusFilter.value === 'pending_alloc') return '待分配'
  if (statusFilter.value === 'allocated') return '已分配'
  return '全部订单'
})

const showFilterCounts = computed(() => !statusFilter.value)

const shipTabs = SHIP_STATUS_OPTIONS
const typeTabs = ORDER_TYPE_OPTIONS

function shipCountOf(value: string) {
  if (!showFilterCounts.value) return null
  return value in shipCounts.value ? shipCounts.value[value] : null
}

function typeCountOf(value: string) {
  if (!showFilterCounts.value) return null
  return value in typeCounts.value ? typeCounts.value[value] : null
}

function baseCountParams() {
  const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
  const kw = keyword.value.trim()
  return {
    keyword: kw || undefined,
    orderedAtStart: kw ? undefined : start,
    orderedAtEnd: kw ? undefined : end,
    page: 1,
    pageSize: 1,
  }
}

async function loadFilterCounts() {
  if (!showFilterCounts.value) {
    shipCounts.value = {}
    typeCounts.value = {}
    return
  }
  const base = baseCountParams()
  try {
    const [shipResults, typeResults] = await Promise.all([
      Promise.all(
        SHIP_STATUS_OPTIONS.map(async (opt) => {
          const res = await omsApi.listOrders({
            ...base,
            sourceChannel: sourceChannel.value || undefined,
            shipStatus: opt.value || undefined,
          })
          return [opt.value, res.total || 0] as const
        }),
      ),
      Promise.all(
        ORDER_TYPE_OPTIONS.map(async (opt) => {
          const res = await omsApi.listOrders({
            ...base,
            shipStatus: shipStatus.value || undefined,
            sourceChannel: opt.value || undefined,
          })
          return [opt.value, res.total || 0] as const
        }),
      ),
    ])
    shipCounts.value = Object.fromEntries(shipResults)
    typeCounts.value = Object.fromEntries(typeResults)
  } catch {
    shipCounts.value = {}
    typeCounts.value = {}
  }
}

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

function rootItems(row: OmsOrder) {
  return listOrderRootItems(row.items)
}

function canQuickAlloc(row: OmsOrder) {
  const s = row.status
  return s === 'pending_alloc' || s === 'pending_ship'
}

function canQuickRevoke(row: OmsOrder) {
  if (!(row.status === 'allocated' || row.status === 'purchasing')) return false
  if (!row.allocType) return false
  if (row.shipStatus === 'shipped') return false
  if (row.sourceChannel === 'kdzs' && row.agentType === 2 && row.dropshipMode === 'kdzs_factory') return false
  return true
}

function canGoShip(row: OmsOrder) {
  if (!row.allocType) return false
  if (row.shipEntryLocked) return false
  if (row.shipStatus === 'shipped') return false
  if (row.allocType === 'dropship' && row.dropshipMode === 'kdzs_factory') return false
  const s = (row.shipStatus || '').toLowerCase()
  return !s || s === 'wait_ship' || s === 'partial_shipped'
}

function setShipStatus(v: string) {
  shipStatus.value = v
  reload()
}

function setSourceChannel(v: string) {
  sourceChannel.value = v
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

function onCardClick(row: OmsOrder) {
  if (selectMode.value) {
    toggleSelect(row.id, !selectedIds.value.has(row.id))
    return
  }
  router.push(`/order/orders/${row.id}`)
}

function goShip(row: OmsOrder) {
  router.push({
    path: `/ship/${row.id}`,
    query: row.orderNo ? { no: row.orderNo } : undefined,
  })
}

async function ensureSuppliers() {
  if (suppliers.value.length) return
  const res = await omsApi.listSuppliers({ page: 1, pageSize: 200 })
  suppliers.value = res.list || []
  filteredSuppliers.value = suppliers.value
}

function filterSuppliers() {
  const q = supplierKeyword.value.trim().toLowerCase()
  if (!q) {
    filteredSuppliers.value = suppliers.value
    return
  }
  filteredSuppliers.value = suppliers.value.filter((s) => s.name.toLowerCase().includes(q))
}

function pickSupplier(s: OmsSupplier) {
  allocForm.supplierId = s.id
  allocForm.supplierName = s.name
}

async function quickAlloc(row: OmsOrder) {
  allocTarget.value = row
  allocForm.allocType = 'dropship'
  allocForm.supplierId = 0
  allocForm.supplierName = ''
  supplierKeyword.value = ''
  try {
    await ensureSuppliers()
    filterSuppliers()
    allocSheetVisible.value = true
  } catch (e: any) {
    showFailToast(e.message || '加载供应商失败')
  }
}

async function submitAlloc() {
  const row = allocTarget.value
  if (!row) return
  if (allocForm.allocType === 'dropship' && !allocForm.supplierId) {
    showFailToast('请选择供应商')
    return
  }
  allocSubmitting.value = true
  try {
    await omsApi.allocateOrder(row.id, {
      allocType: allocForm.allocType,
      supplierId: allocForm.allocType === 'dropship' ? allocForm.supplierId : undefined,
      supplierName: allocForm.allocType === 'dropship' ? allocForm.supplierName : undefined,
    })
    showSuccessToast('分配成功')
    allocSheetVisible.value = false
    reload()
  } catch (e: any) {
    showFailToast(e.message || '分配失败')
  } finally {
    allocSubmitting.value = false
  }
}

async function quickRevoke(row: OmsOrder) {
  try {
    await showConfirmDialog({
      title: '撤回分配',
      message: '确认撤回？将同步快递助手撤单，订单恢复为待分配。',
    })
  } catch {
    return
  }
  try {
    await omsApi.revokeAllocate(row.id)
    showSuccessToast('已撤回')
    reload()
  } catch (e: any) {
    showFailToast(e.message || '撤回失败')
  }
}

function applyDecryptedOrders(items: OmsOrder[]) {
  const byId = new Map(items.map((o) => [o.id, o]))
  list.value = list.value.map((o) => byId.get(o.id) || o)
}

async function decryptOne(row: OmsOrder) {
  if (!canDecryptOrder(row)) {
    showFailToast('仅电商订单可解密')
    return
  }
  decryptRow[row.id] = true
  try {
    const res = await omsApi.decryptOrders([row.id])
    applyDecryptedOrders(res.items || [])
    showSuccessToast('解密成功')
  } catch (e: any) {
    showFailToast(e.message || '解密失败')
  } finally {
    decryptRow[row.id] = false
  }
}

async function copyOrderText(row: OmsOrder) {
  const address = formatAddress(row.address)
  if (!address || address === '-') {
    showFailToast('暂无收件信息，请先解密')
    return
  }
  const ok = await copyToClipboard(buildOrderCopyText(row))
  if (ok) showSuccessToast('已复制')
  else showFailToast('复制失败')
}

async function batchDecrypt() {
  const ids = list.value.filter((o) => selectedIds.value.has(o.id) && canDecryptOrder(o)).map((o) => o.id)
  if (!ids.length) {
    showFailToast('没有可解密的电商订单')
    return
  }
  try {
    const res = await omsApi.decryptOrders(ids)
    applyDecryptedOrders(res.items || [])
    showSuccessToast(`已解密 ${res.success || res.items?.length || 0} 条`)
  } catch (e: any) {
    showFailToast(e.message || '解密失败')
  }
}

async function batchSelfShip() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    await showConfirmDialog({ title: '批量自营', message: `将 ${ids.length} 单分配为自营发货？` })
  } catch {
    return
  }
  let ok = 0
  for (const id of ids) {
    try {
      await omsApi.allocateOrder(id, { allocType: 'self_ship' })
      ok += 1
    } catch {
      /* continue */
    }
  }
  showSuccessToast(`成功 ${ok}/${ids.length}`)
  selectMode.value = false
  selectedIds.value = new Set()
  reload()
}

async function openBatchDropship() {
  batchSupplierId.value = 0
  batchSupplierName.value = ''
  supplierKeyword.value = ''
  try {
    await ensureSuppliers()
    filterSuppliers()
    batchDropVisible.value = true
  } catch (e: any) {
    showFailToast(e.message || '加载供应商失败')
  }
}

async function submitBatchDropship() {
  if (!batchSupplierId.value) {
    showFailToast('请选择供应商')
    return
  }
  const ids = [...selectedIds.value]
  allocSubmitting.value = true
  try {
    const res = await omsApi.batchDropship({
      orderIds: ids,
      supplierId: batchSupplierId.value,
      supplierName: batchSupplierName.value,
    })
    showSuccessToast(`代发成功 ${res.success} 单${res.poNo ? ` · ${res.poNo}` : ''}`)
    batchDropVisible.value = false
    selectMode.value = false
    selectedIds.value = new Set()
    reload()
  } catch (e: any) {
    showFailToast(e.message || '批量代发失败')
  } finally {
    allocSubmitting.value = false
  }
}

async function batchRevoke() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  try {
    await showConfirmDialog({ title: '批量撤回', message: `撤回 ${ids.length} 单分配？` })
  } catch {
    return
  }
  let ok = 0
  for (const id of ids) {
    try {
      await omsApi.revokeAllocate(id)
      ok += 1
    } catch {
      /* continue */
    }
  }
  showSuccessToast(`撤回 ${ok}/${ids.length}`)
  selectMode.value = false
  selectedIds.value = new Set()
  reload()
}

async function loadMore() {
  loading.value = true
  try {
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    const res = await omsApi.listOrders({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      shipStatus: shipStatus.value || undefined,
      sourceChannel: sourceChannel.value || undefined,
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
  void loadFilterCounts()
  void loadMore()
}

watch(
  () => route.query.status,
  () => {
    selectedIds.value = new Set()
    selectMode.value = false
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
.filter-block {
  padding-bottom: 4px;
}
.status-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 4px 12px 8px;
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
  gap: 4px;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.chip-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(15, 31, 42, 0.08);
  color: var(--ops-ink-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}
.status-chip--on .chip-count {
  background: rgba(15, 118, 110, 0.18);
  color: var(--ops-primary);
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
.goods-preview {
  margin: 6px 0 8px;
}
.goods-preview__row {
  display: flex;
  gap: 8px;
  padding: 4px 0;
}
.goods-preview__row img {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: cover;
  background: #eef2f5;
  flex-shrink: 0;
}
.goods-preview__info {
  min-width: 0;
  flex: 1;
}
.goods-preview__title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-goods {
  font-size: 12px;
  padding-top: 2px;
}
.receiver-line {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
  word-break: break-all;
}
.addr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.meta-line {
  margin-top: 4px;
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
  color: var(--ops-ink);
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
  backdrop-filter: blur(8px);
}
.batch-bar__info {
  font-size: 12px;
  color: var(--ops-muted);
  margin-right: auto;
}
.sheet-body {
  padding: 8px 16px 24px;
}
.sheet-label {
  font-size: 13px;
  font-weight: 650;
  margin: 12px 0 8px;
  color: var(--ops-ink-soft);
}
.supplier-list {
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.supplier-item {
  padding: 12px 10px;
  border-bottom: 1px solid var(--ops-line);
  font-size: 14px;
}
.supplier-item--on {
  color: var(--ops-primary);
  font-weight: 650;
  background: var(--ops-primary-soft);
}
</style>
