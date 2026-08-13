<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="已发货详情" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.mailNo || detail.sourceRef || `#${detail.id}` }}</div>
        <div class="detail-hero__tags">
          <span
            class="ops-tag"
            :class="detail.status === 'cancelled' ? 'ops-tag--warn' : 'ops-tag--ok'"
          >{{ shipStatusLabel(detail.status) }}</span>
        </div>
        <div class="detail-hero__sub">
          {{ detail.receiverName }} {{ detail.receiverMobile }}
        </div>
      </div>

      <div class="section-label">运单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">运单号</span><span class="value">{{ detail.mailNo || '-' }}</span></div>
        <div class="detail-row" v-if="detail.mailNo">
          <span class="label">预计派送</span>
          <span class="value">
            <template v-if="promiseLoading">查询中…</template>
            <template v-else-if="promiseLabel">{{ promiseLabel }}</template>
            <template v-else>{{ promiseHint || '-' }}</template>
          </span>
        </div>
        <div class="detail-row"><span class="label">来源单</span><span class="value">{{ detail.sourceRef || '-' }}</span></div>
        <div class="detail-row"><span class="label">订单来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">平台</span><span class="value">{{ detail.platform || '-' }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ addrText }}</span></div>
        <div class="detail-row"><span class="label">货物</span><span class="value">{{ detail.cargoName || '-' }}</span></div>
        <div class="detail-row"><span class="label">打印</span><span class="value">{{ formatTime(detail.printedAt || detail.createdAt) }}</span></div>
        <div class="detail-row">
          <span class="label">打印机</span>
          <span class="value">{{ printerHint }}</span>
        </div>
      </div>

      <div class="section-label">面单</div>
      <div class="card label-card">
        <template v-if="detail.labelPdfUrl">
          <div v-if="labelLoading" class="muted label-tip">面单图片加载中…</div>
          <div v-else-if="labelError" class="label-tip">
            <div class="tip tip--warn">{{ labelError }}</div>
            <van-button size="small" plain hairline type="primary" block @click="openLabelPdf">打开 PDF</van-button>
          </div>
          <template v-else-if="labelPng">
            <van-image
              :src="labelPng"
              fit="contain"
              width="100%"
              class="label-img"
              @click="previewLabel"
            />
            <div class="label-actions">
              <van-button size="small" type="primary" block :loading="saving" @click="saveLabelPng">保存图片</van-button>
              <van-button size="small" plain hairline type="primary" block @click="copyLabelLink">复制链接</van-button>
            </div>
            <div class="muted label-tip">点击放大；长按图片也可保存后发给顾客</div>
          </template>
        </template>
        <div v-else class="muted label-tip">打印后自动存档面单，请稍后下拉刷新</div>
      </div>

      <div class="section-label">物流账号</div>
      <div class="card">
        <button type="button" class="pick-row" @click="showCarrier = true">
          <span class="pick-row__badge carrier">账</span>
          <div class="pick-row__body">
            <div class="pick-row__label">打印用账号</div>
            <div class="pick-row__title">{{ selectedCarrier?.name || '请选择物流账号' }}</div>
            <div class="muted pick-row__sub" v-if="selectedCarrier">
              {{ selectedCarrier.carrierCode || 'SF' }}
              <template v-if="selectedCarrier.custId"> · 月结 {{ selectedCarrier.custId }}</template>
              <template v-else> · 现结可用</template>
              · {{ printChannelLabel }}
            </div>
            <div class="tip tip--warn" v-else>手动填单号等场景需先选账号才能再次打印</div>
          </div>
          <van-icon name="arrow" class="pick-row__arrow" />
        </button>
      </div>

      <div class="section-label" v-if="detail.items?.length">明细</div>
      <div class="card" v-if="detail.items?.length">
        <div v-for="(it, idx) in detail.items" :key="idx" class="goods-row">
          <div class="goods-info">
            <div class="goods-name">{{ it.goodsName }}</div>
            <div class="muted">{{ it.skuCode }} · ×{{ it.quantity }}</div>
          </div>
        </div>
      </div>

      <div class="footer-safe" v-if="canReprint || canCancel">
        <van-button
          v-if="canReprint"
          type="primary"
          block
          round
          :loading="printing"
          :disabled="!selectedCarrierId"
          @click="reprint"
        >
          再次打印
        </van-button>
        <van-button
          v-if="canCancel"
          block
          round
          plain
          hairline
          type="danger"
          class="cancel-btn"
          :loading="cancelling"
          @click="cancelWaybill"
        >
          取消快递单
        </van-button>
        <div class="muted reprint-tip" v-if="canReprint">
          再次打印：用原运单号重打面单，不会重新取号、不会覆盖单号
        </div>
        <div class="muted reprint-tip" v-if="canCancel">
          取消后：清除商品发货单号，订单回退待发货/部分发货；本条保留为取消记录
        </div>
      </div>
      <div class="footer-safe" v-else-if="detail.status === 'cancelled'">
        <div class="muted reprint-tip">运单已取消（保留记录，不可再打印）</div>
      </div>
      <div class="footer-safe" v-else-if="!detail.mailNo">
        <div class="muted reprint-tip">无运单号（可能为手动填单号发货），无法云打印面单</div>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到运单" />

    <van-popup v-model:show="showCarrier" position="bottom" round class="sheet-popup">
      <div class="sheet">
        <div class="sheet-title">选择物流账号</div>
        <button
          v-for="c in enabledCarriers"
          :key="c.id"
          type="button"
          class="option-card"
          :class="{ active: selectedCarrierId === c.id }"
          @click="pickCarrier(c.id!)"
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
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  showConfirmDialog,
  showFailToast,
  showImagePreview,
  showLoadingToast,
  showSuccessToast,
  closeToast,
} from 'vant'
import { getShipment, shippingApi, type CarrierAccount, type Shipment } from '../api/shipping'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'
import { formatOrderSource, formatTime } from '../utils/labels'
import {
  copyText,
  downloadDataUrl,
  renderLabelPdfToPng,
} from '../utils/labelPdfPreview'

const route = useRoute()
const router = useRouter()
const detail = ref<Shipment | null>(null)
const carriers = ref<CarrierAccount[]>([])
const selectedCarrierId = ref<number | undefined>()
const showCarrier = ref(false)
const loading = ref(true)
const printing = ref(false)
const cancelling = ref(false)
const labelLoading = ref(false)
const labelPng = ref('')
const labelError = ref('')
const saving = ref(false)
const promiseLabel = ref('')
const promiseHint = ref('')
const promiseLoading = ref(false)

const enabledCarriers = computed(() => carriers.value.filter((c) => c.enabled !== false && c.id))

const selectedCarrier = computed(
  () => enabledCarriers.value.find((c) => c.id === selectedCarrierId.value) || null,
)

const addrText = computed(() => {
  const d = detail.value
  if (!d) return '-'
  return [d.receiverProvince, d.receiverCity, d.receiverCounty, d.receiverAddress].filter(Boolean).join(' ') || '-'
})

const printerHint = computed(() => {
  const name = getSavedPrinterName()
  const idx = getSavedPrinterIndex()
  if (name) return name
  if (idx != null) return `索引 ${idx}`
  return '未选择（请到打印机管理配置）'
})

const printChannel = computed(() => {
  const d = detail.value
  if (selectedCarrier.value?.printChannel) {
    return selectedCarrier.value.printChannel.toLowerCase()
  }
  if (d?.printChannel) return d.printChannel.toLowerCase()
  return 'plugin'
})

const printChannelLabel = computed(() => (printChannel.value === 'pdf' ? 'PDF 通道' : '插件通道'))

const canReprint = computed(() => {
  const d = detail.value
  if (!d) return false
  if (d.status === 'cancelled') return false
  return !!d.mailNo
})

const canCancel = computed(() => {
  const d = detail.value
  if (!d) return false
  return d.status !== 'cancelled' && d.status !== 'draft'
})

function shipStatusLabel(v?: string) {
  if (!v) return '已发货'
  if (v === 'printed') return '已打单'
  if (v === 'shipped') return '已发货'
  if (v === 'pending') return '待发货'
  if (v === 'cancelled') return '已取消'
  return v
}

function pickCarrier(id: number) {
  selectedCarrierId.value = id
  showCarrier.value = false
}

async function loadLabelPreview(ship: Shipment) {
  const url = (ship.labelPdfUrl || '').trim()
  labelPng.value = ''
  labelError.value = ''
  if (!url) return
  labelLoading.value = true
  try {
    labelPng.value = await renderLabelPdfToPng(url)
  } catch (e) {
    labelError.value = (e as Error).message || '面单渲染失败'
  } finally {
    labelLoading.value = false
  }
}

function openLabelPdf() {
  const url = (detail.value?.labelPdfUrl || '').trim()
  if (!url) return
  window.open(url, '_blank', 'noopener')
}

function previewLabel() {
  if (!labelPng.value) return
  showImagePreview({ images: [labelPng.value], closeable: true })
}

function saveLabelPng() {
  if (!labelPng.value) return
  saving.value = true
  try {
    const no = detail.value?.mailNo || detail.value?.id || 'label'
    downloadDataUrl(labelPng.value, `面单_${no}.png`)
    showSuccessToast('已开始下载')
  } finally {
    saving.value = false
  }
}

async function copyLabelLink() {
  const url = (detail.value?.labelPdfUrl || '').trim()
  if (!url) return
  try {
    await copyText(url)
    showSuccessToast('已复制链接')
  } catch {
    showFailToast('复制失败')
  }
}

function initCarrierSelection(ship: Shipment, list: CarrierAccount[]) {
  const enabled = list.filter((c) => c.enabled !== false && c.id)
  if (ship.carrierAccountId && enabled.some((c) => c.id === ship.carrierAccountId)) {
    selectedCarrierId.value = ship.carrierAccountId
    return
  }
  if (enabled.length === 1) {
    selectedCarrierId.value = enabled[0].id
    return
  }
  selectedCarrierId.value = undefined
}

async function reprint() {
  const d = detail.value
  if (!d?.mailNo) {
    showFailToast('无运单号，无法打印')
    return
  }
  if (d.status === 'cancelled') {
    showFailToast('运单已取消，无法打印')
    return
  }
  if (!selectedCarrierId.value) {
    showFailToast('请先选择物流账号')
    showCarrier.value = true
    return
  }
  const channel = printChannel.value
  let printerIndex: number | null = null
  if (channel !== 'pdf') {
    printerIndex = getSavedPrinterIndex()
    if (printerIndex == null) {
      showFailToast('请先在打印机管理选择打印机')
      await router.push('/printers')
      return
    }
  }
  printing.value = true
  try {
    const used = await printShipmentByChannel({
      shipmentId: d.id,
      printChannel: channel,
      printerIndex,
      carrierAccountId: selectedCarrierId.value,
    })
    showSuccessToast(
      used === 'pdf'
        ? '已打开面单 PDF'
        : `已发送到 ${getSavedPrinterName() || '打印机'}`,
    )
    detail.value = await getShipment(d.id)
    if (detail.value) {
      initCarrierSelection(detail.value, carriers.value)
      void loadLabelPreview(detail.value)
    }
  } catch (e) {
    const msg = (e as Error).message || ''
    if (msg === 'PRINTER_NOT_SELECTED') {
      showFailToast('请先在打印机管理选择打印机')
      await router.push('/printers')
    } else {
      showFailToast(msg || '打印失败')
    }
  } finally {
    printing.value = false
  }
}

async function cancelWaybill() {
  const d = detail.value
  if (!d || d.status === 'cancelled') return
  try {
    await showConfirmDialog({
      title: '取消快递单',
      message: d.mailNo
        ? `确认取消运单 ${d.mailNo}？\n将清除商品发货单号，订单回退待发货/部分发货；本条保留取消记录。`
        : '确认作废该发货单？',
    })
  } catch {
    return
  }
  cancelling.value = true
  try {
    detail.value = await shippingApi.cancelShipment(d.id)
    showSuccessToast(d.mailNo ? '已取消快递单' : '已作废')
  } catch (e) {
    showFailToast((e as Error).message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

async function loadPromiseTm(ship: Shipment) {
  promiseLabel.value = ''
  promiseHint.value = ''
  if (!ship.mailNo?.trim()) return
  promiseLoading.value = true
  try {
    const res = await shippingApi.searchPromiseTm(ship.id)
    promiseLabel.value = res.promiseLabel || ''
    promiseHint.value = res.hint || ''
  } catch (e: any) {
    promiseHint.value = e?.message || '预计派送时间查询失败'
  } finally {
    promiseLoading.value = false
  }
}

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    const [ship, cRes] = await Promise.all([
      getShipment(id),
      shippingApi.listCarrierAccounts({ page: 1, pageSize: 100 }).catch(() => ({ list: [] as CarrierAccount[] })),
    ])
    detail.value = ship
    carriers.value = cRes.list || []
    initCarrierSelection(ship, carriers.value)
    void loadLabelPreview(ship)
    void loadPromiseTm(ship)
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
    closeToast()
  }
})
</script>

<style scoped>
.nav-link {
  color: var(--ops-primary);
  font-size: 14px;
  font-weight: 600;
}
.detail-hero {
  background: linear-gradient(155deg, #0b1f2a, #163447 55%, #047857);
  color: #fff;
  border: none;
}
.detail-hero__no {
  font-family: var(--ops-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  word-break: break-all;
}
.detail-hero__tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.detail-hero__tags .ops-tag,
.detail-hero__tags .ops-tag--ok {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.detail-hero__sub {
  margin-top: 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
}
.pick-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 4px 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.pick-row__badge {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-top: 2px;
}
.pick-row__badge.carrier {
  background: #0f766e;
}
.pick-row__body {
  flex: 1;
  min-width: 0;
}
.pick-row__label {
  font-size: 12px;
  color: var(--ops-muted);
}
.pick-row__title {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 650;
}
.pick-row__sub {
  margin-top: 4px;
  font-size: 12px;
}
.pick-row__arrow {
  color: var(--ops-muted);
  margin-top: 8px;
}
.tip--warn {
  margin-top: 6px;
  color: #b45309;
  font-size: 12px;
  line-height: 1.4;
}
.goods-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.goods-row:last-child {
  border-bottom: none;
}
.goods-name {
  font-weight: 600;
  font-size: 14px;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 30%);
}
.reprint-tip {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  line-height: 1.4;
}
.cancel-btn {
  margin-top: 10px;
}
.label-card {
  padding-bottom: 12px;
}
.label-img {
  display: block;
  max-height: 360px;
  background: #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
}
.label-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.label-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.4;
}
.sheet {
  padding: 16px 16px calc(16px + var(--ops-safe-bottom));
  max-height: 70vh;
  overflow: auto;
}
.sheet-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
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
