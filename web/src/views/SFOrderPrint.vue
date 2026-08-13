<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="顺丰标准寄件" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" class="page-loading" vertical>加载中…</van-loading>

    <div class="page-body" v-else>
      <div v-if="handoffMeta?.orderId || form.orderNo" class="order-banner">
        已带入订单中心 {{ form.orderNo || `#${handoffMeta?.orderId}` }}
      </div>

      <div class="section-label">寄件人</div>
      <div class="card pick-card">
        <button type="button" class="pick-row" @click="showShipper = true">
          <div class="pick-row__badge ship">寄</div>
          <div class="pick-row__body">
            <div class="pick-row__label">寄件人档案</div>
            <div v-if="shipperView" class="pick-row__title">
              {{ shipperView.name }}
              <span v-if="shipperView.isDefault" class="mini-tag">默认</span>
            </div>
            <div v-if="shipperView" class="muted pick-row__sub">
              {{ shipperView.mobile }}
              ·
              {{
                [shipperView.province, shipperView.city, shipperView.county, shipperView.address]
                  .filter(Boolean)
                  .join(' ')
              }}
            </div>
            <div v-else class="muted">点击选择寄件人</div>
            <p v-if="shipperView" class="hint">修改寄件信息请到发货中心「寄件人」档案维护</p>
          </div>
          <span class="pick-row__arrow">›</span>
        </button>
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

      <div class="section-label">物流信息</div>
      <div class="card pick-card">
        <button type="button" class="pick-row" @click="showCarrier = true">
          <div class="pick-row__badge carrier">账</div>
          <div class="pick-row__body">
            <div class="pick-row__label">物流账号</div>
            <div v-if="carrierView" class="pick-row__title">{{ carrierView.name }}</div>
            <div v-if="carrierView" class="muted pick-row__sub">
              {{ carrierView.carrierCode || 'SF' }}
              <template v-if="carrierView.custId"> · 月结 {{ carrierView.custId }}</template>
              <template v-else> · 现结可用</template>
            </div>
            <div v-else class="muted">点击选择物流账号</div>
          </div>
          <span class="pick-row__arrow">›</span>
        </button>

        <div class="field-block">
          <div class="field-label">付款方式</div>
          <van-radio-group v-model="form.payMode" direction="horizontal" class="radio-row radio-row--pay">
            <van-radio name="monthly" :disabled="!carrierView?.custId">寄付月结</van-radio>
            <van-radio name="cash">寄付现结</van-radio>
            <van-radio name="receiver">到付</van-radio>
          </van-radio-group>
        </div>

        <div class="field-block">
          <div class="field-label">寄件方式</div>
          <div class="pickup-mode">
            <button
              type="button"
              class="pickup-btn"
              :class="{ active: form.pickupMode === 'self' }"
              @click="setPickupMode('self')"
            >
              自行联系快递员
            </button>
            <button
              type="button"
              class="pickup-btn"
              :class="{ active: form.pickupMode === 'appoint' }"
              @click="setPickupMode('appoint')"
            >
              预约寄件
            </button>
          </div>
          <button
            v-if="form.pickupMode === 'appoint'"
            type="button"
            class="appoint-trigger"
            @click="showAppoint = true"
          >
            <span :class="{ muted: !appointLabel }">{{ appointLabel || '请选择预约上门时间' }}</span>
            <span class="pick-row__arrow">›</span>
          </button>
          <div v-if="form.pickupMode === 'appoint'" class="pickup-tip">
            将通知快递员按所选时段上门揽收
            <span v-if="sendStartTmPreview">（{{ sendStartTmPreview }} 起）</span>
            <span v-if="pickupWindow"> · 当地可揽 {{ pickupWindow.startTm }}-{{ pickupWindow.endTm }}</span>
            <span v-if="appointLoading"> · 刷新时段中…</span>
          </div>
        </div>

        <div class="product-reco-hd">
          物流产品推荐
          <span class="product-hint">点击切换，与下方当前选择同步</span>
        </div>
        <div class="product-cards">
          <button
            v-for="p in expressProducts"
            :key="p.value"
            type="button"
            class="product-card"
            :class="{ active: form.expressType === p.value }"
            @click="form.expressType = p.value"
          >
            <span v-if="p.tag" class="ptag">{{ p.tag }}</span>
            <div class="pname">{{ p.name }}</div>
            <div class="phint">{{ p.hint }}</div>
            <span v-if="form.expressType === p.value" class="check">✓</span>
          </button>
        </div>
        <div class="product-current muted">
          当前选择：{{ selectedProduct.name }}
          <template v-if="form.payMode === 'monthly' && carrierView?.custId">
            · 月结卡号 {{ carrierView.custId }}
          </template>
        </div>
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
          placeholder="运单备注（选填，显示在面单/清单）"
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
      <div class="sheet">
        <div class="sheet-title">选择物流账号</div>
        <button
          v-for="c in carriers"
          :key="c.id"
          type="button"
          class="option-card"
          :class="{ active: form.carrierAccountId === c.id }"
          @click="pickCarrier(c.id!)"
        >
          <div class="option-card__title">{{ c.name }}</div>
          <div class="muted">
            {{ c.carrierCode || 'SF' }}
            <template v-if="c.custId"> · 月结 {{ c.custId }}</template>
            <template v-else> · 现结可用</template>
          </div>
        </button>
        <div v-if="!carriers.length" class="muted pad">暂无可用物流账号</div>
      </div>
    </van-popup>

    <van-popup v-model:show="showShipper" position="bottom" round>
      <div class="sheet">
        <div class="sheet-title">选择寄件人</div>
        <button
          v-for="s in shippers"
          :key="s.id"
          type="button"
          class="option-card"
          :class="{ active: form.shipperProfileId === s.id }"
          @click="pickShipper(s.id!)"
        >
          <div class="option-card__title">
            {{ s.name }}
            <span v-if="s.isDefault" class="mini-tag">默认</span>
          </div>
          <div class="muted">{{ s.mobile }}</div>
          <div class="muted option-card__addr">
            {{ [s.province, s.city, s.county, s.address].filter(Boolean).join(' ') }}
          </div>
        </button>
        <div v-if="!shippers.length" class="muted pad">暂无寄件人档案</div>
      </div>
    </van-popup>

    <van-popup v-model:show="showAppoint" position="bottom" round>
      <van-cascader
        v-model="appointCascaderValue"
        title="预约上门时间"
        :options="appointCascaderOptions"
        @close="showAppoint = false"
        @finish="onAppointFinish"
      />
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
  appointSlotLabel,
  buildAppointCascaderOptions,
  decodeAppointLeaf,
  defaultAppointSlot,
  encodeAppointLeaf,
  mapPickupApiOptions,
  resolveSendStartTm,
  type AppointOption,
} from '../utils/sfAppointTime'
import {
  consumeSFOrderHandoff,
  goodsCargoName,
  readLastCarrierId,
  readLastShipperId,
  rememberShipPrefs,
  type SFOrderHandoff,
} from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'

const router = useRouter()
const EXPRESS_TYPE_KEY = 'shippingcore.sf.expressType'

const expressProducts = [
  { value: '1', name: '顺丰特快', tag: '时效最优', hint: '时效更快，适合急件' },
  { value: '2', name: '顺丰标快', tag: '经济实惠', hint: '常规时效，性价比高' },
] as const

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
const handoffMeta = ref<Pick<SFOrderHandoff, 'orderId' | 'sourceSystem' | 'partialShip'> | null>(null)
const preferredCarrierId = ref<number | undefined>()
const preferredShipperId = ref<number | undefined>()
const result = ref<{ shipmentId: number; mailNo: string; cancelled?: boolean } | null>(null)
const showCarrier = ref(false)
const showShipper = ref(false)
const showAppoint = ref(false)
const appointLoading = ref(false)
const pickupWindow = ref<{ startTm: string; endTm: string } | null>(null)
const appointCascaderOptions = ref<AppointOption[]>(buildAppointCascaderOptions())
/** Vant Cascader 选中叶子 value（时段 key） */
const appointCascaderValue = ref<string | number>('')

const form = reactive({
  orderNo: '',
  carrierAccountId: undefined as number | undefined,
  shipperProfileId: undefined as number | undefined,
  payMode: 'monthly' as PayMode,
  expressType: (localStorage.getItem(EXPRESS_TYPE_KEY) === '1' ? '1' : '2') as string,
  cargoLines: [emptyCargoLine('商品')] as CargoLine[],
  pickupMode: 'self' as 'self' | 'appoint',
  /** [dayOffset, slotKey] 对齐电脑版 */
  appointSlot: [] as Array<number | string>,
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
const selectedProduct = computed(
  () => expressProducts.find((p) => p.value === form.expressType) || expressProducts[1],
)
const printerName = computed(
  () => getSavedPrinterName() || (getSavedPrinterIndex() != null ? `索引 ${getSavedPrinterIndex()}` : ''),
)
const appointLabel = computed(() => appointSlotLabel(appointCascaderOptions.value, form.appointSlot))
const sendStartTmPreview = computed(() =>
  resolveSendStartTm(form.pickupMode, form.appointSlot, appointCascaderOptions.value),
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

watch(showAppoint, (open) => {
  if (open) {
    void refreshPickupOptions().then(() => {
      const [day, slot] = form.appointSlot
      appointCascaderValue.value =
        day !== undefined && day !== null && slot != null
          ? encodeAppointLeaf(Number(day), String(slot))
          : ''
    })
  }
})

watch(
  () => [form.carrierAccountId, form.shipperProfileId, form.pickupMode] as const,
  () => {
    if (form.pickupMode === 'appoint') void refreshPickupOptions()
  },
)

async function refreshPickupOptions() {
  const carrierId = form.carrierAccountId
  const shipper = shipperView.value
  if (!carrierId || !shipper) {
    appointCascaderOptions.value = buildAppointCascaderOptions()
    pickupWindow.value = null
    return
  }
  appointLoading.value = true
  try {
    const res = await shippingApi.checkPickupTime({
      carrierAccountId: carrierId,
      province: shipper.province,
      city: shipper.city,
      county: shipper.county,
      address: shipper.address,
    })
    pickupWindow.value = { startTm: res.startTm, endTm: res.endTm }
    const mapped = mapPickupApiOptions(res.options || [])
    appointCascaderOptions.value = mapped.length ? mapped : buildAppointCascaderOptions()
    // 若当前选中时段已不在列表中，重置为第一个可用
    if (form.appointSlot.length) {
      const leaf = encodeAppointLeaf(Number(form.appointSlot[0]), String(form.appointSlot[1]))
      const ok = appointCascaderOptions.value.some((d) =>
        d.children.some((c) => c.value === leaf),
      )
      if (!ok) {
        const def = defaultAppointSlot(appointCascaderOptions.value)
        form.appointSlot = [...def]
      }
    }
  } catch {
    appointCascaderOptions.value = buildAppointCascaderOptions()
    pickupWindow.value = null
  } finally {
    appointLoading.value = false
  }
}

function setPickupMode(mode: 'self' | 'appoint') {
  form.pickupMode = mode
  if (mode === 'self') {
    form.appointSlot = []
    appointCascaderValue.value = ''
  } else {
    void refreshPickupOptions().then(() => {
      if (!form.appointSlot.length) {
        const def = defaultAppointSlot(appointCascaderOptions.value)
        form.appointSlot = [...def]
        if (def[0] !== undefined && def[1] != null) {
          appointCascaderValue.value = encodeAppointLeaf(Number(def[0]), String(def[1]))
        }
      }
    })
  }
}

function onAppointFinish({ value }: { value: string | number }) {
  const decoded = decodeAppointLeaf(value)
  if (decoded) {
    form.appointSlot = [...decoded]
    appointCascaderValue.value = encodeAppointLeaf(decoded[0], decoded[1])
  }
  showAppoint.value = false
}

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

function pickCarrier(id: number) {
  form.carrierAccountId = id
  rememberShipPrefs(id, form.shipperProfileId)
  showCarrier.value = false
}

function pickShipper(id: number) {
  form.shipperProfileId = id
  rememberShipPrefs(form.carrierAccountId, id)
  showShipper.value = false
}

function applyHandoff(h: SFOrderHandoff) {
  handoffMeta.value = {
    orderId: h.orderId,
    sourceSystem: h.sourceSystem,
    partialShip: h.partialShip,
  }
  preferredCarrierId.value = h.carrierAccountId
  preferredShipperId.value = h.shipperProfileId
  const o = h.order
  form.orderNo = (o.orderNo || '').trim()
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
    orderNo: form.orderNo || undefined,
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
    return '当前物流账号未配置月结卡号，请改选寄付现结或到付'
  }
  if (form.pickupMode === 'appoint') {
    const tm = resolveSendStartTm(form.pickupMode, form.appointSlot, appointCascaderOptions.value)
    if (!tm) return '请选择预约上门时间'
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
    carrierAccountId: form.carrierAccountId,
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
    rememberShipPrefs(form.carrierAccountId, form.shipperProfileId)
    const useMonthly = form.payMode === 'monthly'
    const order = buildOrderSnapshot()
    const sendStartTm = resolveSendStartTm(
      form.pickupMode,
      form.appointSlot,
      appointCascaderOptions.value,
    )
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
      sendStartTm,
      orderId: handoffMeta.value?.orderId,
      sourceSystem:
        handoffMeta.value?.sourceSystem || (handoffMeta.value?.orderId ? 'ordercore' : undefined),
      order,
    })
    const waybill = await shippingApi.createShipmentWaybill(shipment.id)
    result.value = { shipmentId: waybill.id, mailNo: waybill.mailNo || '' }
    const okMsg = handoffMeta.value?.partialShip
      ? `部分发货成功${waybill.mailNo ? `，${waybill.mailNo}` : ''}（可回待发货继续发剩余）`
      : `下单成功${waybill.mailNo ? `，${waybill.mailNo}` : ''}`
    showSuccessToast(okMsg)
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

function resolveDefaults() {
  const lastC = preferredCarrierId.value || readLastCarrierId()
  const lastS = preferredShipperId.value || readLastShipperId()
  const defaultCarrier =
    carriers.value.find((c) => c.id === lastC) || carriers.value[0]
  const defaultShipper =
    shippers.value.find((s) => s.id === lastS) ||
    shippers.value.find((s) => s.isDefault) ||
    shippers.value[0]
  form.carrierAccountId = defaultCarrier?.id
  form.shipperProfileId = defaultShipper?.id
  if (defaultCarrier) form.payMode = defaultCarrier.useMonthly && defaultCarrier.custId ? 'monthly' : 'cash'
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
  resolveDefaults()
}

onMounted(async () => {
  try {
    const handoff = consumeSFOrderHandoff()
    if (handoff?.order) applyHandoff(handoff)
    else showFailToast('无寄件数据，请从待发货进入')
    await loadOptions()
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
.order-banner {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7e6;
  border: 1px solid #ffe58f;
  font-size: 13px;
  color: #613400;
  font-weight: 550;
  word-break: break-all;
}
.pad {
  padding: 0 16px 12px;
  font-size: 12px;
  line-height: 1.4;
}
.pick-card {
  padding: 4px 0 12px;
}
.pick-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px 16px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.pick-row:active {
  background: rgba(0, 0, 0, 0.03);
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
.pick-row__badge.ship {
  background: #c8161d;
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
  margin-bottom: 2px;
}
.pick-row__title {
  font-weight: 650;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pick-row__sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
}
.pick-row__arrow {
  color: var(--ops-muted);
  font-size: 20px;
  line-height: 1;
  padding-top: 4px;
}
.hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--ops-muted);
  line-height: 1.35;
}
.mini-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--ops-primary);
  background: var(--ops-primary-soft);
  padding: 1px 6px;
  border-radius: 999px;
}
.field-block {
  padding: 10px 16px 4px;
  border-top: 1px solid var(--ops-line);
}
.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ops-ink);
  margin-bottom: 8px;
}
.pickup-mode {
  display: flex;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  overflow: hidden;
}
.pickup-btn {
  flex: 1;
  border: 0;
  background: #fff;
  padding: 10px 6px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
}
.pickup-btn + .pickup-btn {
  border-left: 1px solid #e4e7ec;
}
.pickup-btn.active {
  background: #fff5f5;
  color: #c8161d;
  font-weight: 650;
}
.appoint-trigger {
  margin-top: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  padding: 12px 14px;
  font-size: 14px;
  cursor: pointer;
}
.pickup-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
.product-reco-hd {
  margin: 12px 16px 8px;
  font-size: 14px;
  font-weight: 650;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
}
.product-hint {
  font-size: 12px;
  color: #a8abb2;
  font-weight: 400;
}
.product-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px;
}
.product-card {
  position: relative;
  text-align: left;
  border: 1px solid #dcdfe6;
  background: #fff;
  border-radius: 8px;
  padding: 14px 12px 12px;
  cursor: pointer;
  overflow: hidden;
}
.product-card.active {
  border-color: #c8161d;
  background: #fff5f5;
  box-shadow: 0 0 0 1px #c8161d inset;
}
.ptag {
  display: inline-block;
  font-size: 11px;
  color: #c8161d;
  background: #fff1f0;
  border-radius: 2px;
  padding: 1px 6px;
  margin-bottom: 6px;
}
.pname {
  font-weight: 700;
  font-size: 15px;
  color: #303133;
}
.phint {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}
.product-current {
  margin: 10px 16px 0;
  font-size: 12px;
}
.check {
  position: absolute;
  right: 8px;
  bottom: 6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #c8161d;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet {
  padding: 16px 16px calc(16px + var(--ops-safe-bottom));
  max-height: 70vh;
  overflow: auto;
}
.sheet-title {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 12px;
}
.option-card {
  display: block;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 1.5px solid var(--ops-line);
  background: #fff;
  cursor: pointer;
}
.option-card.active {
  border-color: var(--ops-primary);
  background: var(--ops-primary-soft);
}
.option-card__title {
  font-weight: 650;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.option-card__addr {
  margin-top: 2px;
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
.radio-row {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.radio-row--pay {
  gap: 8px !important;
}
.radio-row--pay :deep(.van-radio__label) {
  margin-left: 4px;
  font-size: 13px;
}
</style>
