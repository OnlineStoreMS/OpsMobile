<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="顺丰标准寄件" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" class="page-loading" vertical>加载中…</van-loading>

    <div class="page-body" v-else>
      <div v-if="handoffMeta?.orderId" class="banner">
        已带入订单 #{{ handoffMeta.orderId }}
        <span v-if="form.sourceTid"> · {{ form.sourceTid }}</span>
      </div>

      <div class="section-label">寄件人</div>
      <div class="card">
        <van-field
          v-model="shipperLabel"
          is-link
          readonly
          label="寄件人"
          placeholder="选择"
          @click="showShipper = true"
        />
        <div v-if="shipperView" class="muted pad">
          {{ shipperView.mobile }} ·
          {{ [shipperView.province, shipperView.city, shipperView.county, shipperView.address].filter(Boolean).join(' ') }}
        </div>
      </div>

      <div class="section-label">收件人</div>
      <div class="card">
        <van-field v-model="form.receiverName" label="姓名" placeholder="收件人" />
        <van-field v-model="form.receiverMobile" label="手机" type="tel" placeholder="手机号" />
        <van-field v-model="form.receiverProvince" label="省" placeholder="省" />
        <van-field v-model="form.receiverCity" label="市" placeholder="市" />
        <van-field v-model="form.receiverCounty" label="区" placeholder="区/县" />
        <van-field
          v-model="form.receiverAddress"
          label="地址"
          type="textarea"
          rows="2"
          autosize
          placeholder="详细地址"
        />
      </div>

      <div class="section-label">物流产品</div>
      <div class="card">
        <van-field
          v-model="carrierLabel"
          is-link
          readonly
          label="物流账号"
          @click="showCarrier = true"
        />
        <van-cell title="产品">
          <template #value>
            <van-radio-group v-model="form.expressType" direction="horizontal">
              <van-radio name="2">标快</van-radio>
              <van-radio name="1">特快</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <van-cell title="付款">
          <template #value>
            <van-radio-group v-model="form.payMode" direction="horizontal">
              <van-radio name="monthly" :disabled="!carrierView?.custId">月结</van-radio>
              <van-radio name="cash">现结</van-radio>
              <van-radio name="receiver">到付</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <van-cell title="取件">
          <template #value>
            <van-radio-group v-model="form.pickupMode" direction="horizontal">
              <van-radio name="self">自行联系</van-radio>
              <van-radio name="appoint">预约上门</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
      </div>

      <div class="section-label">托寄物</div>
      <div class="card">
        <div v-for="(line, idx) in form.cargoLines" :key="idx" class="cargo-block">
          <van-field v-model="line.name" label="名称" placeholder="物品名称" />
          <van-field v-model.number="line.itemCount" type="digit" label="件数" />
          <van-field v-model.number="line.parcelQty" type="digit" label="包裹数" />
          <van-field v-model.number="line.weight" type="number" label="重量kg" />
          <div class="cargo-actions" v-if="form.cargoLines.length > 1">
            <van-button size="mini" plain hairline type="danger" @click="removeCargoLine(idx)">删除行</van-button>
          </div>
        </div>
        <van-button size="small" plain hairline block @click="addCargoLine">+ 增加物品行</van-button>
      </div>

      <div class="section-label">备注</div>
      <div class="card">
        <van-field
          v-model="form.remark"
          type="textarea"
          rows="2"
          autosize
          placeholder="运单备注（选填）"
        />
        <div class="muted pad">打印机：{{ printerName || '未选择（请到打印机管理配置）' }}</div>
      </div>

      <div v-if="result" class="card result-card">
        <div class="result-title">下单成功</div>
        <div>运单号 {{ result.mailNo || `#${result.shipmentId}` }}</div>
        <van-button
          v-if="!result.cancelled"
          size="small"
          plain
          hairline
          type="danger"
          :loading="cancelling"
          class="mt"
          @click="cancelWaybill"
        >
          取消快递单
        </van-button>
      </div>

      <div class="footer-safe">
        <van-button block round :loading="submitting" @click="submit(false)">仅下单</van-button>
        <van-button type="primary" block round :loading="submitting" @click="submit(true)">
          下单并打印
        </van-button>
      </div>
    </div>

    <van-popup v-model:show="showCarrier" position="bottom" round>
      <van-picker :columns="carrierColumns" @confirm="onPickCarrier" @cancel="showCarrier = false" />
    </van-popup>
    <van-popup v-model:show="showShipper" position="bottom" round>
      <van-picker :columns="shipperColumns" @confirm="onPickShipper" @cancel="showShipper = false" />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import {
  shippingApi,
  type CarrierAccount,
  type OrderSnapshot,
  type ShipperProfile,
} from '../api/shipping'
import {
  consumeSFOrderHandoff,
  goodsCargoName,
  type SFOrderHandoff,
} from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'

const router = useRouter()
const EXPRESS_TYPE_KEY = 'shippingcore.sf.expressType'

type PayMode = 'monthly' | 'cash' | 'receiver'
type CargoLine = {
  name: string
  parcelQty: number
  weight: number
  itemCount: number
  orderItemId?: number
  title?: string
  outerId?: string
  price?: number
}

function emptyCargoLine(name = ''): CargoLine {
  return {
    name,
    parcelQty: 1,
    weight: 1,
    itemCount: 1,
    orderItemId: 0,
    title: '',
    outerId: '',
    price: 0,
  }
}

const loading = ref(true)
const submitting = ref(false)
const cancelling = ref(false)
const carriers = ref<CarrierAccount[]>([])
const shippers = ref<ShipperProfile[]>([])
const handoffMeta = ref<Pick<SFOrderHandoff, 'orderId' | 'sourceSystem'> | null>(null)
const result = ref<{ shipmentId: number; mailNo: string; cancelled?: boolean } | null>(null)
const showCarrier = ref(false)
const showShipper = ref(false)

const form = reactive({
  carrierAccountId: undefined as number | undefined,
  shipperProfileId: undefined as number | undefined,
  payMode: 'monthly' as PayMode,
  expressType: (localStorage.getItem(EXPRESS_TYPE_KEY) === '1' ? '1' : '2') as string,
  cargoLines: [emptyCargoLine('商品')] as CargoLine[],
  pickupMode: 'self' as 'self' | 'appoint',
  remark: '',
  receiverName: '',
  receiverMobile: '',
  receiverProvince: '',
  receiverCity: '',
  receiverCounty: '',
  receiverAddress: '',
  platform: '',
  shopId: '',
  sysTid: '',
  sourceTid: '',
  shopName: '',
  sourceChannel: '',
  manualSourceName: '',
})

const shipperView = computed(() => shippers.value.find((s) => s.id === form.shipperProfileId) || null)
const carrierView = computed(() => carriers.value.find((c) => c.id === form.carrierAccountId) || null)
const printerName = computed(
  () => getSavedPrinterName() || (getSavedPrinterIndex() != null ? `索引 ${getSavedPrinterIndex()}` : ''),
)
const carrierLabel = computed(() => {
  const c = carrierView.value
  return c ? `${c.name}${c.carrierCode ? ` · ${c.carrierCode}` : ''}` : ''
})
const shipperLabel = computed(() => {
  const s = shipperView.value
  return s ? `${s.name} ${s.mobile || ''}`.trim() : ''
})
const carrierColumns = computed(() =>
  carriers.value.map((c) => ({ text: `${c.name}`, value: c.id! })),
)
const shipperColumns = computed(() =>
  shippers.value.map((s) => ({ text: `${s.name} ${s.mobile || ''}`.trim(), value: s.id! })),
)

const namedCargoLines = computed(() => form.cargoLines.filter((l) => (l.name || '').trim()))

const cargoTotals = computed(() => {
  const lines = namedCargoLines.value.length ? namedCargoLines.value : form.cargoLines
  let parcelQty = 0
  let weight = 0
  let itemCount = 0
  for (const line of lines) {
    const pq = line.parcelQty > 0 ? line.parcelQty : 1
    parcelQty += pq
    weight += (line.weight > 0 ? line.weight : 0) * pq
    itemCount += (line.itemCount > 0 ? line.itemCount : 0) * pq
  }
  return {
    parcelQty: parcelQty || 1,
    weight: Math.round(weight * 1000) / 1000,
    itemCount: itemCount || 0,
  }
})

watch(
  () => form.expressType,
  (v) => {
    if (v === '1' || v === '2') localStorage.setItem(EXPRESS_TYPE_KEY, v)
  },
)

watch(
  () => form.carrierAccountId,
  (id) => {
    const c = carriers.value.find((x) => x.id === id)
    if (!c) return
    if (c.useMonthly && c.custId) form.payMode = 'monthly'
    else if (form.payMode === 'monthly') form.payMode = 'cash'
  },
)

function addCargoLine() {
  form.cargoLines.push(emptyCargoLine())
}

function removeCargoLine(idx: number) {
  if (form.cargoLines.length <= 1) {
    form.cargoLines[0] = emptyCargoLine()
    return
  }
  form.cargoLines.splice(idx, 1)
}

function onPickCarrier({ selectedOptions }: { selectedOptions: Array<{ value: number }> }) {
  const v = selectedOptions[0]?.value
  if (v != null) form.carrierAccountId = v
  showCarrier.value = false
}

function onPickShipper({ selectedOptions }: { selectedOptions: Array<{ value: number }> }) {
  const v = selectedOptions[0]?.value
  if (v != null) form.shipperProfileId = v
  showShipper.value = false
}

function applyHandoff(h: SFOrderHandoff) {
  handoffMeta.value = { orderId: h.orderId, sourceSystem: h.sourceSystem }
  const o = h.order
  form.platform = o.platform
  form.shopId = o.shopId
  form.shopName = o.shopName || ''
  form.sourceChannel = o.sourceChannel || ''
  form.manualSourceName = o.manualSourceName || ''
  form.sysTid = o.sysTid
  form.sourceTid = o.sourceTid
  form.receiverName = o.receiverName
  form.receiverMobile = o.receiverMobile
  form.receiverProvince = o.receiverProvince
  form.receiverCity = o.receiverCity
  form.receiverCounty = o.receiverCounty
  form.receiverAddress = o.receiverAddress
  const lines = (o.goods || [])
    .map((g) => {
      const name = (g.skuName || g.title || '').trim()
      if (!name) return null
      const line = emptyCargoLine(name)
      line.orderItemId = g.orderItemId || 0
      line.title = g.title || ''
      line.itemCount = g.num > 0 ? g.num : 1
      line.parcelQty = 1
      line.outerId = g.outerId || ''
      line.price = g.price || 0
      return line
    })
    .filter((x): x is CargoLine => !!x)
  form.cargoLines = lines.length ? lines : [emptyCargoLine('商品')]
}

function buildOrderSnapshot(): OrderSnapshot {
  return {
    platform: form.platform,
    shopId: form.shopId,
    shopName: form.shopName,
    sourceChannel: form.sourceChannel,
    manualSourceName: form.manualSourceName,
    sysTid: form.sysTid,
    sourceTid: form.sourceTid,
    receiverName: form.receiverName.trim(),
    receiverMobile: form.receiverMobile.trim(),
    receiverProvince: form.receiverProvince.trim(),
    receiverCity: form.receiverCity.trim(),
    receiverCounty: form.receiverCounty.trim(),
    receiverAddress: form.receiverAddress.trim(),
    goods: namedCargoLines.value.map((l) => ({
      orderItemId: l.orderItemId || 0,
      title: l.title || l.name,
      skuName: l.name,
      num: l.itemCount > 0 ? l.itemCount : 1,
      outerId: l.outerId || '',
      price: l.price || 0,
    })),
  }
}

function validate(): string | null {
  if (!form.carrierAccountId) return '请选择物流账号'
  if (!form.shipperProfileId) return '请选择寄件人'
  if (!form.receiverName.trim() || !form.receiverMobile.trim()) return '请填写收件人姓名与手机'
  if (!form.receiverAddress.trim()) return '请填写收件详细地址'
  if (!namedCargoLines.value.length) return '请至少填写一行物品名称'
  if (handoffMeta.value?.orderId) {
    const linked = namedCargoLines.value.filter((l) => (l.orderItemId || 0) > 0)
    if (!linked.length) return '订单商品行 ID 丢失，请返回重新勾选商品进入'
  }
  for (const [i, line] of namedCargoLines.value.entries()) {
    if (!(line.parcelQty > 0)) return `第 ${i + 1} 行请填写包裹数`
    if (!(line.weight > 0)) return `第 ${i + 1} 行请填写重量`
    if (!(line.itemCount > 0)) return `第 ${i + 1} 行请填写件数`
  }
  if (form.payMode === 'monthly' && !carrierView.value?.custId) {
    return '当前物流账号未配置月结卡号，请改选现结或到付'
  }
  return null
}

async function printShipmentLabel(shipmentId: number) {
  const channel = (carrierView.value?.printChannel || 'plugin').toLowerCase()
  let printerIndex: number | null = null
  if (channel !== 'pdf') {
    printerIndex = getSavedPrinterIndex()
    if (printerIndex == null) {
      showFailToast('请先在打印机管理选择打印机')
      await router.push('/printers')
      throw new Error('PRINTER_NOT_SELECTED')
    }
  }
  await printShipmentByChannel({
    shipmentId,
    printChannel: channel,
    printerIndex,
  })
}

async function cancelWaybill() {
  if (!result.value?.shipmentId || result.value.cancelled) return
  try {
    await showConfirmDialog({
      title: '取消快递单',
      message: `确认取消 ${result.value.mailNo || result.value.shipmentId}？`,
    })
  } catch {
    return
  }
  cancelling.value = true
  try {
    await shippingApi.cancelShipment(result.value.shipmentId)
    result.value = { ...result.value, cancelled: true }
    showSuccessToast('已取消')
  } catch (e) {
    showFailToast((e as Error).message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

async function submit(doPrint: boolean) {
  const err = validate()
  if (err) {
    showFailToast(err)
    return
  }
  submitting.value = true
  result.value = null
  try {
    const useMonthly = form.payMode === 'monthly'
    const order = buildOrderSnapshot()
    const shipment = await shippingApi.createShipmentFromOrder({
      carrierAccountId: form.carrierAccountId!,
      shipperProfileId: form.shipperProfileId!,
      useMonthly,
      expressType: form.expressType,
      payMethod: form.payMode === 'receiver' ? 2 : 1,
      remark: form.remark.trim(),
      cargoName: goodsCargoName(order.goods) || namedCargoLines.value[0]?.name.trim() || '商品',
      parcelQty: cargoTotals.value.parcelQty,
      cargoCount: cargoTotals.value.itemCount || 1,
      totalWeight: cargoTotals.value.weight > 0 ? cargoTotals.value.weight : undefined,
      pickupMode: form.pickupMode,
      orderId: handoffMeta.value?.orderId,
      sourceSystem:
        handoffMeta.value?.sourceSystem || (handoffMeta.value?.orderId ? 'ordercore' : undefined),
      order,
    })
    const waybill = await shippingApi.createShipmentWaybill(shipment.id)
    result.value = { shipmentId: waybill.id, mailNo: waybill.mailNo || '' }
    showSuccessToast(`下单成功${waybill.mailNo ? `，${waybill.mailNo}` : ''}`)
    if (doPrint) {
      try {
        await printShipmentLabel(waybill.id)
        showSuccessToast('已发送到打印机')
      } catch (pe) {
        const msg = (pe as Error).message || ''
        if (msg !== 'PRINTER_NOT_SELECTED') showFailToast(msg || '打印失败')
      }
    }
  } catch (e) {
    showFailToast((e as Error).message || '下单失败')
  } finally {
    submitting.value = false
  }
}

async function loadOptions() {
  const [cRes, sRes] = await Promise.all([
    shippingApi.listCarrierAccounts({ page: 1, pageSize: 100, enabled: true }),
    shippingApi.listShipperProfiles({ page: 1, pageSize: 100, enabled: true }),
  ])
  const all = (cRes.list || []).filter((c) => c.enabled !== false)
  const sf = all.filter((c) => /sf|顺丰/i.test(`${c.carrierCode || ''}${c.name || ''}`))
  carriers.value = sf.length ? sf : all
  shippers.value = (sRes.list || []).filter((s) => s.enabled !== false)
  const defaultCarrier = carriers.value[0]
  const defaultShipper = shippers.value.find((s) => s.isDefault) || shippers.value[0]
  form.carrierAccountId = defaultCarrier?.id
  form.shipperProfileId = defaultShipper?.id
  if (defaultCarrier) form.payMode = defaultCarrier.useMonthly ? 'monthly' : 'cash'
}

onMounted(async () => {
  try {
    await loadOptions()
    const handoff = consumeSFOrderHandoff()
    if (handoff?.order) applyHandoff(handoff)
    else showFailToast('无寄件数据，请从待发货进入')
  } catch (e) {
    showFailToast((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.nav-link {
  color: var(--ops-primary);
  font-size: 14px;
  font-weight: 600;
}
.page-loading {
  padding: 48px 0;
}
.banner {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ops-primary-soft);
  font-size: 13px;
  color: var(--ops-primary);
}
.pad {
  padding: 0 16px 12px;
  font-size: 12px;
  line-height: 1.4;
}
.cargo-block {
  border-bottom: 1px solid var(--ops-line);
  margin-bottom: 8px;
  padding-bottom: 4px;
}
.cargo-block:last-of-type {
  border-bottom: none;
}
.cargo-actions {
  padding: 0 16px 8px;
}
.result-card {
  background: rgba(5, 150, 105, 0.08);
}
.result-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.mt {
  margin-top: 8px;
}
.footer-safe {
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 28%);
}
:deep(.van-radio-group) {
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
