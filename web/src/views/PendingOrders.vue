<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待发货" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="toggleSelectMode">{{ selectMode ? '取消' : '多选' }}</span>
      </template>
    </van-nav-bar>
    <div class="list-shell" :class="{ 'list-shell--batch': selectMode && selectedIds.length }">
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
          :class="{ 'order-card--selected': selectedIds.includes(row.id) }"
          :style="{ animationDelay: `${Math.min(idx, 8) * 0.04}s` }"
          @click="onCardClick(row)"
        >
          <div class="order-card__row">
            <button
              v-if="selectMode"
              type="button"
              class="order-check"
              @click.stop="toggleSelect(row.id)"
            >
              <span
                class="check-box"
                :class="{ 'check-box--on': selectedIds.includes(row.id) }"
                aria-hidden="true"
              >
                <van-icon v-if="selectedIds.includes(row.id)" name="success" />
              </span>
            </button>
            <div class="order-card__main">
              <div class="order-card__top">
                <div class="order-card__no">{{ row.orderNo }}</div>
                <div class="order-card__tags">
                  <span class="ops-tag order-card__tag ops-tag--warn">
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
                <div v-if="!selectMode" class="order-card__actions" @click.stop>
                  <van-button size="mini" plain round hairline type="primary" @click="openShip(row, true)">
                    {{ row.pendingPlanCount ? '编辑拆分' : '拆分' }}
                  </van-button>
                  <van-button size="mini" type="primary" round @click="openShip(row)">
                    打单发货
                  </van-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无待发货" />
      </van-list>
    </div>

    <div v-if="selectMode && selectedIds.length" class="batch-bar">
      <div class="batch-bar__info">
        <div>已选 {{ selectedIds.length }} 单</div>
        <div class="batch-bar__hint" v-if="selectionGroup">
          {{ selectionGroup }} · 可批量远程打单
        </div>
        <div class="batch-bar__hint batch-bar__hint--warn" v-else>
          请只勾选同一平台类目（如全是手工单或全是抖店）
        </div>
      </div>
      <van-button
        type="primary"
        round
        size="small"
        :disabled="!batchEnabled"
        @click="openBatchSheet"
      >
        批量打单
      </van-button>
    </div>

    <van-popup
      v-model:show="showBatchSheet"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
    >
      <div class="sheet">
        <div class="sheet-title">批量远程打单 · {{ selectedIds.length }} 单</div>
        <div class="muted pad-x">平台模板组：{{ selectionGroup || '-' }}</div>
        <button type="button" class="option-card" @click="showDevicePicker = true">
          <div class="option-card__title">
            打单电脑
            <span v-if="kdzsDeviceView" class="mini-tag" :class="kdzsDeviceView.online ? '' : 'mini-tag--off'">
              {{ kdzsDeviceView.online ? '在线' : '离线' }}
            </span>
          </div>
          <div class="muted">{{ kdzsDeviceView?.name || '点击选择 Agent' }}</div>
        </button>
        <button type="button" class="option-card" @click="showTemplatePicker = true">
          <div class="option-card__title">{{ selectionGroup }}模板</div>
          <div class="muted">{{ kdzsTemplateView?.templateName || `点击选择${selectionGroup}模板` }}</div>
        </button>
        <div class="muted pad">
          打印机用 Agent / 打单机页配置
          <button type="button" class="link-inline" @click="router.push('/kdzs-print')">去配置</button>
          <span v-if="kdzsPrinterName"> · {{ kdzsPrinterName }}</span>
        </div>
        <van-button
          type="primary"
          block
          round
          :loading="batchSubmitting"
          :disabled="!canSubmitBatch"
          @click="submitBatchKdzs"
        >
          发送到电脑打单
        </van-button>
      </div>
    </van-popup>

    <van-popup
      v-model:show="showDevicePicker"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
    >
      <div class="sheet">
        <div class="sheet-title">选择打单电脑（Agent）</div>
        <button
          v-for="d in kdzsDevices"
          :key="d.id"
          type="button"
          class="option-card"
          :class="{ active: kdzsDeviceId === d.id }"
          @click="pickDevice(d.id)"
        >
          <div class="option-card__title">
            {{ d.name }}
            <span class="mini-tag" :class="d.online ? '' : 'mini-tag--off'">{{ d.online ? '在线' : '离线' }}</span>
          </div>
          <div class="muted">{{ d.deviceKey }}</div>
        </button>
        <div v-if="!kdzsDevices.length" class="muted pad">暂无打单机，请先启动 WindowsAgent</div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="showTemplatePicker"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
    >
      <div class="sheet">
        <div class="sheet-title">选择{{ selectionGroup }}模板</div>
        <van-search v-model="templateKeyword" placeholder="搜索模板" shape="round" />
        <button
          v-for="t in filteredTemplates"
          :key="templateKey(t)"
          type="button"
          class="option-card"
          :class="{ active: kdzsTemplateKey === templateKey(t) }"
          @click="pickTemplate(t)"
        >
          <div class="option-card__title">{{ t.templateName }}</div>
          <div class="muted">
            {{ [t.carrierName, t.platform, t.shopName].filter(Boolean).join(' · ') }}
          </div>
        </button>
        <div v-if="!filteredTemplates.length" class="muted pad">暂无{{ selectionGroup }}模板</div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  listPendingOmsOrders,
  shippingApi,
  type ExpressTemplate,
  type KdzsPrintDevice,
  type OMSOrder,
} from '../api/shipping'
import { readKdzsPrinterName } from '../utils/kdzsPrinter'
import { formatOrderSource, formatTime, labelShipStatus } from '../utils/labels'
import {
  formatOrderGoodsSummary,
  healShipPlanLines,
  omsOrderToSnapshot,
} from '../utils/sfOrderHandoff'

const KDZS_DEVICE_KEY = 'opsmobile.kdzs.deviceId'
const KDZS_TEMPLATE_KEY = 'opsmobile.kdzs.templateKey'

const route = useRoute()
const router = useRouter()
const keyword = ref('')
/** all = 待发货+部分发货；partial = 仅部分发货 */
const filter = ref<'all' | 'partial'>(route.query.tab === 'partial' ? 'partial' : 'all')
const list = ref<OMSOrder[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const selectMode = ref(false)
const selectedIds = ref<number[]>([])
const showBatchSheet = ref(false)
const showDevicePicker = ref(false)
const showTemplatePicker = ref(false)
const batchSubmitting = ref(false)
const kdzsDevices = ref<KdzsPrintDevice[]>([])
const allTemplates = ref<ExpressTemplate[]>([])
const kdzsDeviceId = ref<number | undefined>()
const kdzsTemplateKey = ref('')
const templateKeyword = ref('')
const kdzsPrinterName = ref(readKdzsPrinterName())

const selectedOrders = computed(() =>
  list.value.filter((o) => selectedIds.value.includes(o.id)),
)

const selectionGroup = computed(() => {
  if (!selectedOrders.value.length) return ''
  const groups = new Set(selectedOrders.value.map((o) => templatePlatformGroup(o)))
  return groups.size === 1 ? [...groups][0] : ''
})

const batchEnabled = computed(() => selectedOrders.value.length > 0 && !!selectionGroup.value)

const kdzsDeviceView = computed(
  () => kdzsDevices.value.find((d) => d.id === kdzsDeviceId.value) || null,
)

const kdzsTemplates = computed(() =>
  allTemplates.value.filter(
    (t) => t.enabled !== false && t.platform === selectionGroup.value,
  ),
)

const kdzsTemplateView = computed(
  () => kdzsTemplates.value.find((t) => templateKey(t) === kdzsTemplateKey.value) || null,
)

const filteredTemplates = computed(() => {
  const kw = templateKeyword.value.trim().toLowerCase()
  if (!kw) return kdzsTemplates.value
  return kdzsTemplates.value.filter((t) =>
    [t.templateName, t.templateId, t.carrierName, t.platform, t.shopName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(kw),
  )
})

const canSubmitBatch = computed(
  () =>
    batchEnabled.value &&
    !!kdzsDeviceId.value &&
    !!kdzsTemplateView.value &&
    !!kdzsDeviceView.value?.online,
)

function templateKey(t: ExpressTemplate) {
  return String(t.templateId || t.id || t.templateName || '')
}

/** 与发货中心 / 单票打单页一致 */
function templatePlatformGroup(o?: OMSOrder | null): string {
  const code = (o?.platform || '').trim().toUpperCase()
  const channel = (o?.sourceChannel || '').trim().toLowerCase()
  if (code === 'FXG' || code === 'DY') return '抖店'
  if (code === 'TB') return '菜鸟'
  if (code === 'DFHAND' || code === 'HAND' || code === 'MANUAL' || channel === 'manual') return '菜鸟'
  if (code === 'XHS') return '小红书'
  if (code === 'PDD') return '拼多多'
  if (code === 'KSXD' || code === 'KS') return '快手小店'
  if (code === 'JD') return '京东'
  if (code === 'SPH') return '视频号'
  return '菜鸟'
}

function orderPlatformCode(o?: OMSOrder | null): string {
  const code = (o?.platform || '').trim().toUpperCase()
  if (code === 'DY') return 'FXG'
  if (code === 'HAND' || code === 'MANUAL') return 'DFHAND'
  return code || 'FXG'
}

function calendarYmd(raw?: string): string | null {
  if (!raw) return null
  const m = String(raw).match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function buildKdzsOrderTimeRange(orders: OMSOrder[]): { from: string; to: string } | null {
  const days: string[] = []
  for (const o of orders) {
    const ymd = calendarYmd(o.payTime || o.orderedAt)
    if (ymd) days.push(ymd)
  }
  if (!days.length) return null
  days.sort()
  return {
    from: `${days[0]} 00:00:00`,
    to: `${days[days.length - 1]} 23:59:59`,
  }
}

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

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) {
    selectedIds.value = []
    showBatchSheet.value = false
  }
}

function toggleSelect(id: number) {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

function onCardClick(row: OMSOrder) {
  if (selectMode.value) {
    toggleSelect(row.id)
    return
  }
  openDetail(row)
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
  selectedIds.value = []
  void reload()
}

function pickDevice(id: number) {
  kdzsDeviceId.value = id
  localStorage.setItem(KDZS_DEVICE_KEY, String(id))
  showDevicePicker.value = false
}

function pickTemplate(t: ExpressTemplate) {
  const key = templateKey(t)
  kdzsTemplateKey.value = key
  localStorage.setItem(KDZS_TEMPLATE_KEY, key)
  showTemplatePicker.value = false
}

async function loadKdzsOptions() {
  const [dRes, tRes] = await Promise.all([
    shippingApi.listKdzsPrintDevices().catch(() => ({ list: [] as KdzsPrintDevice[], total: 0 })),
    shippingApi
      .listExpressTemplates({ page: 1, pageSize: 500 })
      .catch(() => ({ list: [] as ExpressTemplate[], total: 0, page: 1, pageSize: 500 })),
  ])
  kdzsDevices.value = dRes.list || []
  allTemplates.value = (tRes.list || []).filter((t) => t.enabled !== false)
  kdzsPrinterName.value = readKdzsPrinterName()

  const savedDev = Number(localStorage.getItem(KDZS_DEVICE_KEY) || 0)
  if (savedDev && kdzsDevices.value.some((d) => d.id === savedDev)) {
    kdzsDeviceId.value = savedDev
  } else {
    const online = kdzsDevices.value.find((d) => d.online)
    kdzsDeviceId.value = online?.id || kdzsDevices.value[0]?.id
  }

  const savedTpl = localStorage.getItem(KDZS_TEMPLATE_KEY) || ''
  if (savedTpl && kdzsTemplates.value.some((t) => templateKey(t) === savedTpl)) {
    kdzsTemplateKey.value = savedTpl
  } else if (kdzsTemplates.value[0]) {
    kdzsTemplateKey.value = templateKey(kdzsTemplates.value[0])
  } else {
    kdzsTemplateKey.value = ''
  }
}

async function openBatchSheet() {
  if (!batchEnabled.value) {
    showFailToast('请只勾选同一平台类目的订单')
    return
  }
  try {
    await loadKdzsOptions()
    showBatchSheet.value = true
  } catch (e) {
    showFailToast((e as Error).message || '加载打单配置失败')
  }
}

function buildHandoffOrders(orders: OMSOrder[]) {
  return orders.map((o) => {
    const snap = omsOrderToSnapshot(o)
    return {
      orderId: o.id,
      orderNo: o.orderNo || '',
      platformSysTid: o.platformSysTid || '',
      platformOrderId: o.platformOrderId || '',
      sysTid: o.platformSysTid || '',
      tid: o.platformOrderId || '',
      payTime: o.payTime || '',
      orderedAt: o.orderedAt || '',
      goods: (snap.goods || []).map((g) => {
        const name = (g.skuName || g.title || '').trim()
        return {
          title: name,
          skuName: name,
          outerId: g.outerId,
          num: g.num,
        }
      }),
    }
  })
}

async function submitBatchKdzs() {
  const orders = selectedOrders.value
  if (!orders.length || !selectionGroup.value) {
    showFailToast('请只勾选同一平台类目的订单')
    return
  }
  const device = kdzsDeviceView.value
  if (!device || !kdzsDeviceId.value) {
    showFailToast('请选择打单电脑（Agent）')
    return
  }
  if (!device.online) {
    showFailToast('电脑离线，请确认 WindowsAgent 已运行并保持心跳')
    return
  }
  const tpl = kdzsTemplateView.value
  if (!tpl?.templateName && !tpl?.templateId) {
    showFailToast(`请选择${selectionGroup.value}模板`)
    return
  }
  for (const o of orders) {
    const plat = orderPlatformCode(o)
    const sysTid = (o.platformSysTid || '').trim()
    const platOid = (o.platformOrderId || '').trim()
    if (plat === 'DFHAND' && !sysTid && !platOid) {
      showFailToast(`订单 ${o.orderNo || o.id} 尚未同步快递助手编号，请先推送后再打单`)
      return
    }
  }

  const printer = readKdzsPrinterName()
  kdzsPrinterName.value = printer
  const platform = orderPlatformCode(orders[0])
  const timeRange = buildKdzsOrderTimeRange(orders)
  const payload: Record<string, unknown> = {
    v: 1,
    createdAt: Date.now(),
    platform,
    templateName: tpl.templateName || '',
    templateId: tpl.templateId,
    printerName: printer || '',
    orders: buildHandoffOrders(orders),
    orderTimeFrom: timeRange?.from,
    orderTimeTo: timeRange?.to,
    autoPrint: true,
  }
  if (orders.length === 1) {
    payload.orderId = orders[0].id
    payload.order = omsOrderToSnapshot(orders[0])
    payload.autoConfirmShip = true
  }

  batchSubmitting.value = true
  try {
    localStorage.setItem(KDZS_DEVICE_KEY, String(kdzsDeviceId.value))
    if (kdzsTemplateKey.value) localStorage.setItem(KDZS_TEMPLATE_KEY, kdzsTemplateKey.value)
    const task = await shippingApi.createKdzsPrintTask({
      deviceId: kdzsDeviceId.value,
      payload,
    })
    if (task.merged) {
      showSuccessToast(
        `已合并进排队批量 #${task.id}${task.orderCount ? `（共 ${task.orderCount} 单）` : ''}`,
      )
    } else {
      showSuccessToast(`已下发批量任务 #${task.id}（${orders.length} 单）`)
    }
    showBatchSheet.value = false
    selectMode.value = false
    selectedIds.value = []
    await router.push('/kdzs-print')
  } catch (e) {
    showFailToast((e as Error).message || '下发失败')
  } finally {
    batchSubmitting.value = false
  }
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
  selectedIds.value = []
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
.nav-link {
  color: var(--ops-primary);
  font-size: 14px;
  font-weight: 600;
  padding: 0 4px;
}
.order-card {
  animation: page-in 0.35s ease both;
}
.order-card--selected {
  outline: 1.5px solid var(--ops-primary);
  outline-offset: -1px;
}
.order-card__row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.order-card__main {
  flex: 1;
  min-width: 0;
}
.order-check {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: transparent;
}
.check-box {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--ops-line);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #fff;
  font-size: 14px;
}
.check-box--on {
  border-color: var(--ops-primary);
  background: var(--ops-primary);
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
.list-shell--batch {
  padding-bottom: 72px;
}
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid var(--ops-line);
  box-shadow: 0 -6px 20px rgba(15, 23, 42, 0.06);
}
.batch-bar__info {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 650;
  color: var(--ops-text);
}
.batch-bar__hint {
  margin-top: 2px;
  font-size: 12px;
  font-weight: 400;
  color: var(--ops-muted);
}
.batch-bar__hint--warn {
  color: #c2410c;
}
.sheet {
  padding: 16px 14px calc(16px + env(safe-area-inset-bottom));
  max-height: 78vh;
  overflow: auto;
}
.sheet-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 10px;
}
.option-card {
  width: 100%;
  text-align: left;
  border: 1px solid var(--ops-line);
  background: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 8px;
}
.option-card.active {
  border-color: var(--ops-primary);
  background: var(--ops-primary-soft);
}
.option-card__title {
  font-size: 14px;
  font-weight: 650;
  color: var(--ops-text);
  display: flex;
  align-items: center;
  gap: 6px;
}
.mini-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--ops-primary);
}
.mini-tag--off {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
}
.muted {
  color: var(--ops-muted);
  font-size: 12px;
  margin-top: 4px;
}
.pad {
  padding: 8px 4px 12px;
}
.pad-x {
  padding: 0 4px 10px;
}
.link-inline {
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 0 4px;
}
</style>
