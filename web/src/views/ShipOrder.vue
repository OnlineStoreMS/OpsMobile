<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="打单发货" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>

    <div class="page-body" v-if="order">
      <div class="card order-hero">
        <div class="order-hero__no">{{ order.orderNo }}</div>
        <div class="muted">
          {{ receiverName }} {{ receiverPhone }}
        </div>
        <div class="addr">{{ receiverAddr }}</div>
      </div>

      <div class="section-label">
        发货商品
        <span class="section-label__extra" v-if="itemTotal">
          已选 {{ selectedIndexes.length }}/{{ itemTotal }}
        </span>
      </div>
      <div class="card">
        <van-checkbox-group v-model="selectedIndexes">
          <div v-for="(it, idx) in order.items || []" :key="it.id ?? idx" class="goods-row">
            <van-checkbox :name="idx" />
            <img v-if="it.picUrl" :src="it.picUrl" alt="" />
            <div class="goods-info">
              <div class="goods-name">{{ it.skuSpecs || it.productName || '商品' }}</div>
              <div class="muted">×{{ it.quantity || 1 }}</div>
            </div>
          </div>
        </van-checkbox-group>
        <div v-if="!(order.items || []).length" class="muted">无商品行</div>
        <div class="select-bar" v-else>
          <van-button size="mini" plain hairline @click="selectAll">全选</van-button>
          <van-button size="mini" plain hairline @click="selectedIndexes = []">清空</van-button>
        </div>
        <div class="muted tip tip--inline" v-if="itemTotal && selectedIndexes.length && selectedIndexes.length < itemTotal">
          部分发货：仅勾选商品会写入本次运单
        </div>
      </div>

      <div class="section-label">发货方式</div>
      <div class="card">
        <van-radio-group v-model="shipMode" direction="horizontal" class="mode-radios">
          <van-radio name="manual">手动填单号</van-radio>
          <van-radio name="print">自建物流打单</van-radio>
        </van-radio-group>
      </div>

      <template v-if="shipMode === 'manual'">
        <div class="section-label">物流信息</div>
        <div class="card">
          <van-field
            v-model="expressCompany"
            is-link
            readonly
            label="物流公司"
            placeholder="选择快递公司"
            @click="showCompany = true"
          />
          <van-field
            v-model="expressNo"
            label="运单号"
            placeholder="填写快递单号"
            clearable
            maxlength="40"
          />
          <div class="muted tip">勾选商品后填写单号，点发货即可回写订单中心（支持部分发货）。</div>
        </div>
      </template>

      <template v-else>
        <div class="section-label">自建物流</div>
        <div class="card">
          <van-cell title="物流方式" value="自建物流（顺丰）" />
          <van-field
            v-model="carrierLabel"
            is-link
            readonly
            label="物流账号"
            placeholder="选择账号"
            @click="showCarrier = true"
          />
          <van-field
            v-model="shipperLabel"
            is-link
            readonly
            label="寄件人"
            placeholder="选择寄件人"
            @click="showShipper = true"
          />
          <van-cell title="打单方式">
            <template #value>
              <van-radio-group v-model="sfAction" direction="horizontal">
                <van-radio name="standard">标准寄件</van-radio>
                <van-radio name="quick">快速下单打印</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="muted tip">
            {{
              sfAction === 'standard'
                ? '进入标准寄件页，可完善托寄物、预约上门、备注后下单打印。'
                : '使用上次快件类型直接取号，并发送到已配置的云端打印机。'
            }}
          </div>
        </div>
      </template>

      <div class="footer-safe">
        <van-button
          type="primary"
          block
          round
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ primaryLabel }}
        </van-button>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />

    <van-popup v-model:show="showCompany" position="bottom" round>
      <van-picker
        :columns="companyColumns"
        @confirm="onPickCompany"
        @cancel="showCompany = false"
      />
    </van-popup>
    <van-popup v-model:show="showCarrier" position="bottom" round>
      <van-picker
        :columns="carrierColumns"
        @confirm="onPickCarrier"
        @cancel="showCarrier = false"
      />
    </van-popup>
    <van-popup v-model:show="showShipper" position="bottom" round>
      <van-picker
        :columns="shipperColumns"
        @confirm="onPickShipper"
        @cancel="showShipper = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import {
  getOmsOrder,
  listPendingOmsOrders,
  shippingApi,
  type CarrierAccount,
  type OMSOrder,
  type ShipperProfile,
} from '../api/shipping'
import { omsOrderToSnapshot, saveSFOrderHandoff, goodsCargoName } from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'

const route = useRoute()
const router = useRouter()
const order = ref<OMSOrder | null>(null)
const loading = ref(true)
const submitting = ref(false)
const selectedIndexes = ref<number[]>([])
const carriers = ref<CarrierAccount[]>([])
const shippers = ref<ShipperProfile[]>([])
const carrierAccountId = ref<number | undefined>()
const shipperProfileId = ref<number | undefined>()
const shipMode = ref<'manual' | 'print'>('manual')
const sfAction = ref<'standard' | 'quick'>('standard')
const showCarrier = ref(false)
const showShipper = ref(false)
const showCompany = ref(false)

const EXPRESS_TYPE_KEY = 'shippingcore.sf.expressType'
const EXPRESS_COMPANY_KEY = 'opsmobile.ship.expressCompany'

const expressCompanyOptions = [
  '圆通速递',
  '中通快递',
  '申通快递',
  '韵达快递',
  '极兔速递',
  '顺丰速运',
  '京东快递',
  '德邦快递',
  '邮政快递包裹',
  'EMS',
  '其他',
]

const expressCompany = ref(localStorage.getItem(EXPRESS_COMPANY_KEY) || '')
const expressNo = ref('')

const receiverName = computed(
  () => order.value?.buyerName || order.value?.address?.name || '-',
)
const receiverPhone = computed(
  () => order.value?.buyerPhone || order.value?.address?.phone || '',
)
const receiverAddr = computed(() => {
  const a = order.value?.address
  if (!a) return '暂无地址'
  return a.fullText || [a.province, a.city, a.district, a.address].filter(Boolean).join(' ') || '暂无地址'
})

const itemTotal = computed(() => (order.value?.items || []).length)

const carrierLabel = computed(() => {
  const c = carriers.value.find((x) => x.id === carrierAccountId.value)
  return c ? `${c.name}${c.carrierCode ? ` · ${c.carrierCode}` : ''}` : ''
})
const shipperLabel = computed(() => {
  const s = shippers.value.find((x) => x.id === shipperProfileId.value)
  return s ? `${s.name} ${s.mobile || ''}`.trim() : ''
})

const companyColumns = computed(() =>
  expressCompanyOptions.map((name) => ({ text: name, value: name })),
)
const carrierColumns = computed(() =>
  carriers.value.map((c) => ({ text: `${c.name}${c.carrierCode ? ` (${c.carrierCode})` : ''}`, value: c.id! })),
)
const shipperColumns = computed(() =>
  shippers.value.map((s) => ({ text: `${s.name} ${s.mobile || ''}`.trim(), value: s.id! })),
)

const canSubmit = computed(() => {
  if (!order.value || selectedIndexes.value.length === 0) return false
  if (shipMode.value === 'manual') {
    return !!expressCompany.value.trim() && !!expressNo.value.trim()
  }
  return !!carrierAccountId.value && !!shipperProfileId.value
})

const primaryLabel = computed(() => {
  if (shipMode.value === 'manual') return '确认发货'
  if (sfAction.value === 'standard') return '前往标准寄件'
  return '快速下单打印'
})

function selectAll() {
  selectedIndexes.value = (order.value?.items || []).map((_, i) => i)
}

function buildSnapshot() {
  if (!order.value) return null
  const snapshot = omsOrderToSnapshot(order.value, { itemIndexes: selectedIndexes.value })
  if (snapshot.goods.some((g) => !(g.orderItemId && g.orderItemId > 0))) {
    showFailToast('商品行 ID 缺失，请刷新订单后重试')
    return null
  }
  return snapshot
}

function onPickCompany({ selectedOptions }: { selectedOptions: Array<{ text: string; value: string }> }) {
  const v = selectedOptions[0]?.value
  if (v) {
    expressCompany.value = v
    localStorage.setItem(EXPRESS_COMPANY_KEY, v)
  }
  showCompany.value = false
}

function onPickCarrier({ selectedOptions }: { selectedOptions: Array<{ text: string; value: number }> }) {
  const v = selectedOptions[0]?.value
  if (v != null) carrierAccountId.value = v
  showCarrier.value = false
}

function onPickShipper({ selectedOptions }: { selectedOptions: Array<{ text: string; value: number }> }) {
  const v = selectedOptions[0]?.value
  if (v != null) shipperProfileId.value = v
  showShipper.value = false
}

async function loadOrder(id: number) {
  try {
    return await getOmsOrder(id)
  } catch {
    const no = typeof route.query.no === 'string' ? route.query.no : ''
    const res = await listPendingOmsOrders({
      keyword: no || String(id),
      shipStatus: 'wait_ship',
      page: 1,
      pageSize: 50,
    })
    return (res.list || []).find((o) => o.id === id) || (res.list || []).find((o) => o.orderNo === no) || null
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
  carrierAccountId.value = carriers.value[0]?.id
  shipperProfileId.value = shippers.value.find((s) => s.isDefault)?.id || shippers.value[0]?.id
}

async function goManualShip() {
  if (!order.value) return
  const snapshot = buildSnapshot()
  if (!snapshot) return
  const company = expressCompany.value.trim()
  const no = expressNo.value.trim()
  if (!company) {
    showFailToast('请选择物流公司')
    return
  }
  if (!no) {
    showFailToast('请填写运单号')
    return
  }
  submitting.value = true
  try {
    localStorage.setItem(EXPRESS_COMPANY_KEY, company)
    const shipment = await shippingApi.confirmKdzsShip({
      orderId: order.value.id,
      expressNo: no,
      expressCompany: company,
      order: snapshot,
    })
    const partial =
      itemTotal.value > 0 && selectedIndexes.value.length < itemTotal.value ? '（部分发货）' : ''
    showSuccessToast(`已发货${partial}${no ? ` · ${no}` : ''}`)
    if (shipment?.id) {
      await router.replace(`/shipped/${shipment.id}`)
    } else {
      await router.replace('/shipped')
    }
  } catch (e) {
    showFailToast((e as Error).message || '发货失败')
  } finally {
    submitting.value = false
  }
}

async function goStandard() {
  if (!order.value) return
  const snapshot = buildSnapshot()
  if (!snapshot) return
  saveSFOrderHandoff({
    orderId: order.value.id,
    sourceSystem: 'ordercore',
    order: snapshot,
  })
  await router.push('/sf-order')
}

async function goQuick() {
  if (!order.value || !carrierAccountId.value || !shipperProfileId.value) return
  const snapshot = buildSnapshot()
  if (!snapshot) return
  const printerIndex = getSavedPrinterIndex()
  const carrier = carriers.value.find((c) => c.id === carrierAccountId.value)
  const channel = (carrier?.printChannel || 'plugin').toLowerCase()
  if (channel !== 'pdf' && printerIndex == null) {
    showFailToast('请先在打印机管理选择打印机')
    await router.push('/printers')
    return
  }

  submitting.value = true
  try {
    const savedExpress = localStorage.getItem(EXPRESS_TYPE_KEY)
    const expressType = savedExpress === '1' || savedExpress === '2' ? savedExpress : '2'
    const useMonthly = !!(carrier?.useMonthly && carrier.custId)
    const shipment = await shippingApi.createShipmentFromOrder({
      carrierAccountId: carrierAccountId.value,
      shipperProfileId: shipperProfileId.value,
      useMonthly,
      expressType,
      cargoName: goodsCargoName(snapshot.goods),
      parcelQty: 1,
      cargoCount: snapshot.goods.reduce((n, g) => n + (g.num || 1), 0) || 1,
      totalWeight: 1,
      pickupMode: 'self',
      orderId: order.value.id,
      sourceSystem: 'ordercore',
      order: snapshot,
    })
    const waybill = await shippingApi.createShipmentWaybill(shipment.id)
    await printShipmentByChannel({
      shipmentId: waybill.id,
      printChannel: channel,
      printerIndex,
    })
    showSuccessToast(
      `已下单${waybill.mailNo ? ` ${waybill.mailNo}` : ''}，已发往 ${getSavedPrinterName() || '打印机'}`,
    )
    await router.replace(`/shipped/${waybill.id}`)
  } catch (e) {
    showFailToast((e as Error).message || '打单失败')
  } finally {
    submitting.value = false
  }
}

async function submit() {
  if (!order.value || selectedIndexes.value.length === 0) {
    showFailToast('请先勾选要发货的商品')
    return
  }
  if (shipMode.value === 'manual') {
    await goManualShip()
    return
  }
  if (!carrierAccountId.value || !shipperProfileId.value) {
    showFailToast('请选择物流账号和寄件人')
    return
  }
  if (sfAction.value === 'standard') await goStandard()
  else await goQuick()
}

onMounted(async () => {
  const id = Number(route.params.orderId)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    await loadOptions()
    order.value = id ? await loadOrder(id) : null
    selectAll()
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
.section-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.section-label__extra {
  font-size: 12px;
  font-weight: 500;
  color: var(--ops-muted);
}
.order-hero__no {
  font-family: var(--ops-display);
  font-weight: 700;
  font-size: 17px;
  margin-bottom: 6px;
}
.addr {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ops-muted);
  line-height: 1.45;
}
.goods-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.goods-row:last-of-type {
  border-bottom: none;
}
.goods-row img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}
.goods-info {
  flex: 1;
  min-width: 0;
}
.goods-name {
  font-weight: 600;
  font-size: 14px;
}
.select-bar {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.mode-radios {
  padding: 12px 16px;
  justify-content: flex-start !important;
  gap: 16px !important;
}
.tip {
  padding: 0 16px 12px;
  font-size: 12px;
  line-height: 1.45;
}
.tip--inline {
  padding: 8px 0 0;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 30%);
}
:deep(.van-radio-group) {
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
:deep(.van-cell__value) {
  flex: 1.4;
}
</style>
