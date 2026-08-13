<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="打单发货" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>

    <div class="page-body" v-if="order">
      <div class="card order-hero">
        <div class="order-hero__top">
          <div class="order-hero__no">{{ order.orderNo }}</div>
          <span v-if="order.shipStatus === 'partial_shipped'" class="tag-partial">部分发货</span>
        </div>
        <div class="muted">
          {{ receiverName }} {{ receiverPhone }}
        </div>
        <div class="addr">{{ receiverAddr }}</div>
      </div>

      <div class="section-label">
        发货商品
        <span class="section-label__extra" v-if="shipRows.length">
          已选 {{ selectedIndexes.length }}/{{ shipRows.length }}
        </span>
      </div>
      <div class="card">
        <div class="ship-items-hd" v-if="shipRows.length">
          <button type="button" class="check-all" @click="toggleAll">
            <span class="check-box" :class="{ 'check-box--on': allSelected, 'check-box--half': indeterminate }">
              <van-icon v-if="allSelected" name="success" />
              <span v-else-if="indeterminate" class="check-box__dash" />
            </span>
            <span>全选</span>
          </button>
          <span class="muted hd-hint" v-if="doneRows.length">
            另有 {{ doneRows.length }} 件已发完
          </span>
        </div>
        <div class="goods-list">
          <button
            v-for="row in shipRows"
            :key="row.index"
            type="button"
            class="goods-row"
            @click="toggleItem(row.index)"
          >
            <span
              class="check-box"
              :class="{ 'check-box--on': selectedIndexes.includes(row.index) }"
              aria-hidden="true"
            >
              <van-icon v-if="selectedIndexes.includes(row.index)" name="success" />
            </span>
            <img v-if="row.item.picUrl" :src="row.item.picUrl" alt="" />
            <div class="goods-info">
              <div class="goods-name">{{ row.item.skuSpecs || row.item.productName || '商品' }}</div>
              <div class="muted qty-line">
                待发 ×{{ row.remaining }}
                <span v-if="row.shipped > 0"> · 已发 {{ row.shipped }}/{{ row.item.quantity || 0 }}</span>
              </div>
            </div>
          </button>
        </div>
        <div v-if="!shipRows.length" class="muted empty-ship">
          {{ (order.items || []).length ? '商品均已发完，无需再发' : '无商品行' }}
        </div>
        <div
          class="tip tip--warn tip--inline"
          v-if="shipRows.length && selectedIndexes.length === 0"
        >
          请先勾选要发货的商品，否则无法确认发货或进入下一步
        </div>
        <div
          class="muted tip tip--inline"
          v-else-if="isPartialSelection"
        >
          部分发货：仅勾选商品按剩余可发数量写入本次运单，订单将保持「部分发货」直至全部发完
        </div>
        <div
          class="muted tip tip--inline"
          v-else-if="order.shipStatus === 'partial_shipped' && shipRows.length"
        >
          继续发货：下方仅显示尚未发完的商品，全选即发完本单剩余
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
        <div class="card pick-card">
          <button type="button" class="pick-row" @click="openCompanySheet">
            <div class="pick-row__badge carrier">运</div>
            <div class="pick-row__body">
              <div class="pick-row__label">物流公司</div>
              <div v-if="expressCompany" class="pick-row__title">{{ expressCompany }}</div>
              <div v-else class="muted">点击选择快递公司（可搜索）</div>
              <div v-if="expressCompanyCode" class="muted pick-row__sub">编码 {{ expressCompanyCode }}</div>
            </div>
            <span class="pick-row__arrow">›</span>
          </button>
          <van-field
            v-model="expressNo"
            label="运单号"
            placeholder="填写或粘贴快递单号"
            clearable
            maxlength="40"
            :error="!!expressNoError"
            :error-message="expressNoError"
            @blur="onExpressNoBlur"
            @update:model-value="onExpressNoInput"
          />
          <div v-if="expressNoHint && !expressNoError" class="muted tip tip--ok">{{ expressNoHint }}</div>
          <div class="muted tip">勾选商品后选择物流公司并填写单号，点发货即可回写订单中心（支持部分发货）。</div>
        </div>
      </template>

      <template v-else>
        <div class="section-label">自建物流</div>
        <div class="card pick-card">
          <button type="button" class="pick-row" @click="showShipper = true">
            <div class="pick-row__badge ship">寄</div>
            <div class="pick-row__body">
              <div class="pick-row__label">寄件人</div>
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
            </div>
            <span class="pick-row__arrow">›</span>
          </button>
          <button type="button" class="pick-row" @click="showCarrier = true">
            <div class="pick-row__badge carrier">账</div>
            <div class="pick-row__body">
              <div class="pick-row__label">物流账号</div>
              <div v-if="carrierView" class="pick-row__title">{{ carrierView.name }}</div>
              <div v-if="carrierView" class="muted pick-row__sub">
                {{ carrierView.carrierCode || 'SF' }}
                <template v-if="carrierView.custId"> · 月结 {{ carrierView.custId }}</template>
                <template v-else> · 现结</template>
              </div>
              <div v-else class="muted">点击选择物流账号</div>
            </div>
            <span class="pick-row__arrow">›</span>
          </button>
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

    <van-popup v-model:show="showCompany" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet sheet--company">
        <div class="sheet-title">选择物流公司</div>
        <van-search
          v-model="companyKeyword"
          placeholder="搜索名称或编码，如 中通 / ZTO"
          shape="round"
        />
        <div class="company-list">
          <button
            v-for="c in filteredCompanies"
            :key="c.code"
            type="button"
            class="option-card"
            :class="{ active: expressCompanyCode === c.code }"
            @click="pickCompany(c)"
          >
            <div class="option-card__title">{{ c.name }}</div>
            <div class="muted">{{ c.code }}</div>
          </button>
          <div v-if="!filteredCompanies.length" class="muted pad">无匹配快递公司</div>
        </div>
      </div>
    </van-popup>
    <van-popup v-model:show="showCarrier" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择物流账号</div>
        <button
          v-for="c in carriers"
          :key="c.id"
          type="button"
          class="option-card"
          :class="{ active: carrierAccountId === c.id }"
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
    <van-popup v-model:show="showShipper" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择寄件人</div>
        <button
          v-for="s in shippers"
          :key="s.id"
          type="button"
          class="option-card"
          :class="{ active: shipperProfileId === s.id }"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import {
  getOmsOrder,
  listPendingOmsOrders,
  shippingApi,
  type CarrierAccount,
  type OMSOrder,
  type OMSOrderItem,
  type ShipperProfile,
} from '../api/shipping'
import {
  findExpressCompany,
  normalizeExpressNo,
  searchExpressCompanies,
  validateExpressNo,
  type ExpressCompany,
} from '../utils/expressWaybill'
import {
  goodsCargoName,
  omsOrderToSnapshot,
  readLastCarrierId,
  readLastShipperId,
  remainingQtyByItem,
  rememberShipPrefs,
  saveSFOrderHandoff,
  shippedQtyByItem,
} from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'

type ShipRow = {
  index: number
  item: OMSOrderItem
  remaining: number
  shipped: number
}

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
const EXPRESS_COMPANY_CODE_KEY = 'opsmobile.ship.expressCompanyCode'

const savedCompany = findExpressCompany(localStorage.getItem(EXPRESS_COMPANY_CODE_KEY) || '')
  || findExpressCompany(localStorage.getItem(EXPRESS_COMPANY_KEY) || '')
const expressCompany = ref(savedCompany?.name || localStorage.getItem(EXPRESS_COMPANY_KEY) || '')
const expressCompanyCode = ref(savedCompany?.code || '')
const expressNo = ref('')
const expressNoError = ref('')
const expressNoHint = ref('')
const companyKeyword = ref('')

const filteredCompanies = computed(() => searchExpressCompanies(companyKeyword.value))

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

const shipRows = computed<ShipRow[]>(() => {
  const o = order.value
  if (!o?.items?.length) return []
  const remaining = remainingQtyByItem(o)
  const shipped = shippedQtyByItem(o)
  return o.items
    .map((item, index) => {
      const id = item.id
      const left = id ? remaining[id] : item.quantity || 0
      const done = id ? shipped[id] || 0 : 0
      return { index, item, remaining: left, shipped: done }
    })
    .filter((r) => r.remaining > 0)
})

const doneRows = computed(() => {
  const o = order.value
  if (!o?.items?.length) return []
  const remaining = remainingQtyByItem(o)
  return o.items.filter((it) => it.id && (remaining[it.id] || 0) <= 0)
})

const allSelected = computed(
  () => shipRows.value.length > 0 && selectedIndexes.value.length === shipRows.value.length,
)
const indeterminate = computed(
  () => selectedIndexes.value.length > 0 && selectedIndexes.value.length < shipRows.value.length,
)

const carrierView = computed(
  () => carriers.value.find((x) => x.id === carrierAccountId.value) || null,
)
const shipperView = computed(
  () => shippers.value.find((x) => x.id === shipperProfileId.value) || null,
)

const canSubmit = computed(() => {
  if (!order.value || selectedIndexes.value.length === 0) return false
  if (shipMode.value === 'manual') {
    return (
      !!expressCompany.value.trim() &&
      !!expressNo.value.trim() &&
      !expressNoError.value
    )
  }
  return !!carrierAccountId.value && !!shipperProfileId.value
})

const primaryLabel = computed(() => {
  if (shipMode.value === 'manual') return '确认发货'
  if (sfAction.value === 'standard') return '前往标准寄件'
  return '快速下单打印'
})

function selectAllShippable() {
  selectedIndexes.value = shipRows.value.map((r) => r.index)
}

function toggleAll() {
  if (allSelected.value) selectedIndexes.value = []
  else selectAllShippable()
}

function toggleItem(index: number) {
  const cur = selectedIndexes.value
  if (cur.includes(index)) {
    selectedIndexes.value = cur.filter((i) => i !== index)
  } else {
    selectedIndexes.value = [...cur, index]
  }
}

function buildSnapshot() {
  if (!order.value) return null
  const allowed = new Set(shipRows.value.map((r) => r.index))
  const indexes = selectedIndexes.value.filter((i) => allowed.has(i))
  if (!indexes.length) {
    showFailToast('请先勾选要发货的商品')
    return null
  }
  if (indexes.length !== selectedIndexes.value.length) {
    selectedIndexes.value = indexes
  }
  const snapshot = omsOrderToSnapshot(order.value, {
    itemIndexes: indexes,
    qtyByItemId: remainingQtyByItem(order.value),
  })
  if (!snapshot.goods.length) {
    showFailToast('没有可发商品，请刷新订单后重试')
    return null
  }
  if (snapshot.goods.some((g) => !(g.orderItemId && g.orderItemId > 0))) {
    showFailToast('商品行 ID 缺失，无法部分发货，请刷新订单后重试')
    return null
  }
  if (snapshot.goods.some((g) => !(g.num > 0))) {
    showFailToast('发货数量无效，请刷新订单后重试')
    return null
  }
  return snapshot
}

const isPartialSelection = computed(
  () =>
    shipRows.value.length > 0 &&
    selectedIndexes.value.length > 0 &&
    selectedIndexes.value.length < shipRows.value.length,
)

function refreshExpressNoCheck(opts?: { autoFillCompany?: boolean }) {
  const raw = expressNo.value
  if (!raw.trim()) {
    expressNoError.value = ''
    expressNoHint.value = ''
    return { ok: false as const, normalized: '' }
  }
  const result = validateExpressNo(raw, expressCompanyCode.value || expressCompany.value)
  if (result.ok) {
    expressNoError.value = ''
    expressNoHint.value = result.normalized !== normalizeExpressNo(raw) ? `已识别：${result.normalized}` : ''
  } else {
    expressNoError.value = result.message || '运单号格式不正确'
    expressNoHint.value = ''
  }
  if (opts?.autoFillCompany && !expressCompanyCode.value && result.suggested) {
    expressCompany.value = result.suggested.name
    expressCompanyCode.value = result.suggested.code
    expressNoHint.value = `已根据单号识别为「${result.suggested.name}」`
    localStorage.setItem(EXPRESS_COMPANY_KEY, result.suggested.name)
    localStorage.setItem(EXPRESS_COMPANY_CODE_KEY, result.suggested.code)
    // 公司变了再校一次
    return refreshExpressNoCheck()
  }
  return result
}

function onExpressNoInput() {
  if (expressNoError.value) refreshExpressNoCheck()
}

function onExpressNoBlur() {
  const result = refreshExpressNoCheck({ autoFillCompany: true })
  if (result.ok && result.normalized) {
    expressNo.value = result.normalized
  }
}

function openCompanySheet() {
  companyKeyword.value = ''
  showCompany.value = true
}

function pickCompany(c: ExpressCompany) {
  expressCompany.value = c.name
  expressCompanyCode.value = c.code
  localStorage.setItem(EXPRESS_COMPANY_KEY, c.name)
  localStorage.setItem(EXPRESS_COMPANY_CODE_KEY, c.code)
  showCompany.value = false
  if (expressNo.value.trim()) refreshExpressNoCheck()
}

watch(expressCompanyCode, () => {
  if (expressNo.value.trim()) refreshExpressNoCheck()
})

function pickCarrier(id: number) {
  carrierAccountId.value = id
  rememberShipPrefs(id, shipperProfileId.value)
  showCarrier.value = false
}

function pickShipper(id: number) {
  shipperProfileId.value = id
  rememberShipPrefs(carrierAccountId.value, id)
  showShipper.value = false
}

async function loadOrder(id: number) {
  // 必须拉详情（含 shipments.items），否则无法计算剩余可发数量
  try {
    return await getOmsOrder(id)
  } catch (e) {
    const no = typeof route.query.no === 'string' ? route.query.no : ''
    const res = await listPendingOmsOrders({
      keyword: no || String(id),
      shipStatus: 'need_ship',
      page: 1,
      pageSize: 50,
    })
    const hit =
      (res.list || []).find((o) => o.id === id) ||
      (res.list || []).find((o) => o.orderNo === no) ||
      null
    if (!hit) throw e
    // 列表也可能带运单明细；仍尽量再拉一次详情
    try {
      return await getOmsOrder(hit.id)
    } catch {
      return hit
    }
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

  const lastC = readLastCarrierId()
  const lastS = readLastShipperId()
  carrierAccountId.value =
    carriers.value.find((c) => c.id === lastC)?.id || carriers.value[0]?.id
  shipperProfileId.value =
    shippers.value.find((s) => s.id === lastS)?.id ||
    shippers.value.find((s) => s.isDefault)?.id ||
    shippers.value[0]?.id
}

async function goManualShip() {
  if (!order.value) return
  const snapshot = buildSnapshot()
  if (!snapshot) return
  const company = expressCompany.value.trim()
  if (!company) {
    showFailToast('请选择物流公司')
    return
  }
  const check = refreshExpressNoCheck({ autoFillCompany: true })
  if (!check.ok) {
    showFailToast(expressNoError.value || '请填写正确的运单号')
    return
  }
  const no = check.normalized
  expressNo.value = no
  submitting.value = true
  try {
    localStorage.setItem(EXPRESS_COMPANY_KEY, company)
    if (expressCompanyCode.value) {
      localStorage.setItem(EXPRESS_COMPANY_CODE_KEY, expressCompanyCode.value)
    }
    const shipment = await shippingApi.confirmKdzsShip({
      orderId: order.value.id,
      expressNo: no,
      expressCompany: company,
      order: snapshot,
    })
    const isPartial = isPartialSelection.value
    showSuccessToast(isPartial ? `已部分发货${no ? ` · ${no}` : ''}` : `已发货${no ? ` · ${no}` : ''}`)
    if (isPartial) {
      await router.replace({ path: '/pending', query: { tab: 'partial' } })
    } else if (shipment?.id) {
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
  rememberShipPrefs(carrierAccountId.value, shipperProfileId.value)
  saveSFOrderHandoff({
    orderId: order.value.id,
    sourceSystem: 'ordercore',
    order: snapshot,
    carrierAccountId: carrierAccountId.value,
    shipperProfileId: shipperProfileId.value,
    partialShip: isPartialSelection.value,
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
    rememberShipPrefs(carrierAccountId.value, shipperProfileId.value)
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
    if (isPartialSelection.value) {
      await router.replace({ path: '/pending', query: { tab: 'partial' } })
    } else {
      await router.replace(`/shipped/${waybill.id}`)
    }
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
    // 默认不勾选，需用户主动勾选后才能发货
    selectedIndexes.value = []
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
.order-hero__top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.order-hero__no {
  font-family: var(--ops-display);
  font-weight: 700;
  font-size: 17px;
}
.tag-partial {
  font-size: 11px;
  font-weight: 600;
  color: #b45309;
  background: #fef3c7;
  padding: 2px 8px;
  border-radius: 999px;
}
.addr {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ops-muted);
  line-height: 1.45;
}
.ship-items-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--ops-line);
  margin-bottom: 4px;
}
.check-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ops-ink);
  cursor: pointer;
}
.check-box {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid #c4c9d2;
  background: #fff;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;
}
.check-box--on {
  border-color: var(--ops-primary);
  background: var(--ops-primary);
}
.check-box--half {
  border-color: var(--ops-primary);
  background: #fff;
}
.check-box__dash {
  width: 10px;
  height: 2px;
  border-radius: 1px;
  background: var(--ops-primary);
}
.hd-hint {
  font-size: 12px;
}
.goods-list {
  display: flex;
  flex-direction: column;
}
.goods-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 12px 2px;
  border: 0;
  border-bottom: 1px solid var(--ops-line);
  background: transparent;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.goods-row:active {
  opacity: 0.88;
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
.qty-line {
  margin-top: 2px;
  font-size: 12px;
}
.empty-ship {
  padding: 12px 0;
  font-size: 13px;
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
.tip--warn {
  color: #b45309;
  font-size: 12px;
  line-height: 1.45;
}
.tip--ok {
  padding: 0 16px 4px;
  color: #059669;
}
.sheet--company {
  display: flex;
  flex-direction: column;
  max-height: 78vh;
  padding-bottom: calc(8px + var(--ops-safe-bottom));
}
.sheet--company .sheet-title {
  padding: 0 4px;
}
.company-list {
  flex: 1;
  overflow: auto;
  padding: 4px 0 8px;
  -webkit-overflow-scrolling: touch;
}
.pick-card {
  padding: 4px 0;
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
  border-bottom: 1px solid var(--ops-line);
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
  background: #2563eb;
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
.mini-tag {
  font-size: 10px;
  font-weight: 600;
  color: var(--ops-primary);
  background: var(--ops-primary-soft);
  padding: 1px 6px;
  border-radius: 999px;
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
.pad {
  padding: 8px 0 12px;
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
