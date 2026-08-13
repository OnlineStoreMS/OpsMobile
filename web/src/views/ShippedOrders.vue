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
            <span
              class="ops-tag order-card__tag"
              :class="row.status === 'cancelled' ? 'ops-tag--warn' : 'ops-tag--ok'"
            >{{ shipStatusLabel(row.status) }}</span>
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
            <div class="order-card__time">发货时间 {{ shipTimeText(row) }}</div>
            <div class="order-card__actions" @click.stop>
              <van-button
                v-if="canReprint(row)"
                size="mini"
                type="primary"
                plain
                hairline
                round
                :loading="printingId === row.id"
                @click="openReprint(row)"
              >
                再次打印
              </van-button>
              <van-button
                v-if="canCancel(row)"
                size="mini"
                type="danger"
                plain
                hairline
                round
                :loading="cancellingId === row.id"
                @click="cancelRow(row)"
              >
                取消
              </van-button>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无已发货单" />
      </van-list>
    </div>

    <van-popup v-model:show="showCarrier" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择物流账号后打印</div>
        <div class="muted sheet-sub" v-if="pendingRow">
          运单 {{ pendingRow.mailNo }}
        </div>
        <button
          v-for="c in enabledCarriers"
          :key="c.id"
          type="button"
          class="option-card"
          :class="{ active: pickCarrierId === c.id }"
          @click="pickCarrierId = c.id"
        >
          <div class="option-card__title">{{ c.name }}</div>
          <div class="muted">
            {{ c.carrierCode || 'SF' }}
            <template v-if="c.custId"> · 月结 {{ c.custId }}</template>
            <template v-else> · 现结可用</template>
            · {{ (c.printChannel || 'plugin').toLowerCase() === 'pdf' ? 'PDF' : '插件' }}
          </div>
        </button>
        <div v-if="!enabledCarriers.length" class="muted pad">暂无可用物流账号</div>
        <van-button
          type="primary"
          block
          round
          :loading="printingId != null"
          :disabled="!pickCarrierId"
          style="margin-top: 12px"
          @click="confirmReprint"
        >
          确认打印
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import DateRangeBar from '../components/DateRangeBar.vue'
import { listShipments, shippingApi, type CarrierAccount, type Shipment } from '../api/shipping'
import { formatOrderSource, formatTime } from '../utils/labels'
import { toApiDateTimeRange, todayDay } from '../utils/dateRange'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'
import { isKdzsShipment, isSFManagedShipment } from '../utils/shipmentFlags'

const router = useRouter()
const keyword = ref('')
const rangeStart = ref(todayDay())
const rangeEnd = ref(todayDay())
const list = ref<Shipment[]>([])
const carriers = ref<CarrierAccount[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const printingId = ref<number | null>(null)
const cancellingId = ref<number | null>(null)
const showCarrier = ref(false)
const pendingRow = ref<Shipment | null>(null)
const pickCarrierId = ref<number | undefined>()

const enabledCarriers = computed(() => carriers.value.filter((c) => c.enabled !== false && c.id))

function shipStatusLabel(v?: string) {
  if (!v) return '已发货'
  if (v === 'printed') return '已打单'
  if (v === 'shipped') return '已发货'
  if (v === 'pending') return '待发货'
  if (v === 'cancelled') return '已取消'
  return v
}

/** 卡片底部：取号/确认发货时间，不用打印时间 */
function shipTimeText(row: Shipment) {
  const t = row.shippedAt || (row.mailNo ? row.createdAt : '') || ''
  return formatTime(t)
}

function canReprint(row: Shipment) {
  return !!row.mailNo && row.status !== 'cancelled' && isSFManagedShipment(row) && !isKdzsShipment(row)
}

function canCancel(row: Shipment) {
  return row.status !== 'cancelled' && row.status !== 'draft' && !isKdzsShipment(row)
}

function printChannelOf(carrierId?: number, row?: Shipment | null) {
  const carrier = enabledCarriers.value.find((c) => c.id === carrierId)
  if (carrier?.printChannel) return carrier.printChannel.toLowerCase()
  if (row?.printChannel) return row.printChannel.toLowerCase()
  return 'plugin'
}

function openReprint(row: Shipment) {
  if (!canReprint(row)) {
    showFailToast('无法打印该运单')
    return
  }
  pendingRow.value = row
  if (row.carrierAccountId && enabledCarriers.value.some((c) => c.id === row.carrierAccountId)) {
    pickCarrierId.value = row.carrierAccountId
  } else if (enabledCarriers.value.length === 1) {
    pickCarrierId.value = enabledCarriers.value[0].id
  } else {
    pickCarrierId.value = undefined
  }
  showCarrier.value = true
}

async function confirmReprint() {
  const row = pendingRow.value
  if (!row) return
  if (!pickCarrierId.value) {
    showFailToast('请选择物流账号')
    return
  }
  const channel = printChannelOf(pickCarrierId.value, row)
  let printerIndex: number | null = null
  if (channel !== 'pdf') {
    printerIndex = getSavedPrinterIndex()
    if (printerIndex == null) {
      showFailToast('请先在打印机管理选择打印机')
      showCarrier.value = false
      await router.push('/printers')
      return
    }
  }
  printingId.value = row.id
  try {
    const used = await printShipmentByChannel({
      shipmentId: row.id,
      printChannel: channel,
      printerIndex,
      carrierAccountId: pickCarrierId.value,
    })
    showCarrier.value = false
    showSuccessToast(
      used === 'pdf'
        ? `已打开 ${row.mailNo} 面单`
        : `已发送 ${row.mailNo} 到 ${getSavedPrinterName() || '打印机'}`,
    )
  } catch (e) {
    showFailToast((e as Error).message || '打印失败')
  } finally {
    printingId.value = null
  }
}

async function cancelRow(row: Shipment) {
  if (!canCancel(row)) return
  try {
    await showConfirmDialog({
      title: '取消快递单',
      message: row.mailNo
        ? `确认取消运单 ${row.mailNo}？订单将回退待发货/部分发货，本条保留取消记录。`
        : '确认作废该发货单？',
    })
  } catch {
    return
  }
  cancellingId.value = row.id
  try {
    const updated = await shippingApi.cancelShipment(row.id)
    const idx = list.value.findIndex((x) => x.id === row.id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...updated }
    showSuccessToast(row.mailNo ? '已取消快递单' : '已作废')
  } catch (e) {
    showFailToast((e as Error).message || '取消失败')
  } finally {
    cancellingId.value = null
  }
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
      status: 'printed,cancelled',
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

onMounted(async () => {
  try {
    const cRes = await shippingApi.listCarrierAccounts({ page: 1, pageSize: 100 })
    carriers.value = cRes.list || []
  } catch {
    carriers.value = []
  }
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
.order-card__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.sheet {
  padding: 16px 16px calc(16px + var(--ops-safe-bottom));
  max-height: 70vh;
  overflow: auto;
}
.sheet-title {
  font-size: 16px;
  font-weight: 700;
}
.sheet-sub {
  margin: 6px 0 12px;
  font-size: 13px;
}
.option-card {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--ops-line);
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  margin-bottom: 8px;
  cursor: pointer;
}
.option-card.active {
  border-color: var(--ops-primary);
  background: rgba(15, 118, 110, 0.06);
}
.option-card__title {
  font-weight: 650;
  font-size: 15px;
}
.pad {
  padding: 12px 0;
}
</style>
