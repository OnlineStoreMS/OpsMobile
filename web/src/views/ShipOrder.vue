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
        <span class="section-label__extra">
          <button type="button" class="link-btn" @click="openSplitEdit">
            {{ pendingPlanCount ? '编辑拆分' : '拆分' }}
          </button>
          <template v-if="shipPickRows.length">
            · 已选 {{ selectedKeys.length }}/{{ shipPickRows.length }}
          </template>
        </span>
      </div>
      <div class="card">
        <div class="ship-items-hd" v-if="shipPickRows.length">
          <button type="button" class="check-all" @click="toggleAll">
            <span class="check-box" :class="{ 'check-box--on': allSelected, 'check-box--half': indeterminate }">
              <van-icon v-if="allSelected" name="success" />
              <span v-else-if="indeterminate" class="check-box__dash" />
            </span>
            <span>全选</span>
          </button>
          <span class="muted hd-hint" v-if="pendingPlanCount">
            已拆 {{ pendingPlanCount }} 段
          </span>
        </div>
        <div class="goods-list">
          <div
            v-for="row in shipPickRows"
            :key="row.key"
            class="goods-row goods-row--pick"
          >
            <button type="button" class="goods-row__check" @click="toggleItem(row.key)">
              <span
                class="check-box"
                :class="{ 'check-box--on': selectedKeys.includes(row.key) }"
                aria-hidden="true"
              >
                <van-icon v-if="selectedKeys.includes(row.key)" name="success" />
              </span>
            </button>
            <img
              v-if="row.picUrl"
              class="pic-preview"
              :src="row.picUrl"
              alt=""
              @click.stop="previewProductImage(row.picUrl, shipPickRows.map((r) => r.picUrl))"
            />
            <div class="goods-info">
              <div class="goods-name">
                {{ row.label }}
                <span v-if="row.kind === 'plan'" class="tag-split">拆分</span>
              </div>
              <div class="qty-edit" @click.stop>
                <span class="muted">发货</span>
                <van-stepper
                  v-model="row.shipQty"
                  :min="1"
                  :max="row.maxQty"
                  integer
                  theme="round"
                  button-size="22px"
                />
                <span class="muted">/ {{ row.maxQty }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!shipPickRows.length" class="muted empty-ship">
          {{ (order.items || []).length ? '商品均已发完，无需再发' : '无商品行' }}
        </div>
        <div
          class="tip tip--warn tip--inline"
          v-if="shipPickRows.length && selectedKeys.length === 0"
        >
          请先勾选要发货的商品，否则无法确认发货或进入下一步
        </div>
        <div
          class="muted tip tip--inline"
          v-else-if="isPartialSelection"
        >
          部分发货：仅勾选商品按本次件数写入运单，订单将保持「部分发货」直至全部发完
        </div>
        <div
          class="muted tip tip--inline"
          v-else-if="order.shipStatus === 'partial_shipped' && shipPickRows.length"
        >
          继续发货：下方仅显示尚未发完的商品/拆分段，全选即发完本单剩余
        </div>
      </div>

      <div class="section-label">发货方式</div>
      <div class="card">
        <van-radio-group v-model="shipMode" direction="horizontal" class="mode-radios mode-radios--wrap">
          <van-radio name="manual">手动填单号</van-radio>
          <van-radio name="print">自建物流打单</van-radio>
          <van-radio name="kdzs">快递助手打单</van-radio>
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

      <template v-else-if="shipMode === 'kdzs'">
        <div class="section-label">快递助手</div>
        <div class="card pick-card">
          <button type="button" class="pick-row" @click="showKdzsDevice = true">
            <div class="pick-row__badge ship">机</div>
            <div class="pick-row__body">
              <div class="pick-row__label">打单电脑</div>
              <div v-if="kdzsDeviceView" class="pick-row__title">
                {{ kdzsDeviceView.name }}
                <span class="mini-tag" :class="kdzsDeviceView.online ? '' : 'mini-tag--off'">
                  {{ kdzsDeviceView.online ? '在线' : '离线' }}
                </span>
              </div>
              <div v-else class="muted">点击选择已绑定电脑</div>
              <div v-if="kdzsDeviceView" class="muted pick-row__sub">{{ kdzsDeviceView.deviceKey }}</div>
            </div>
            <span class="pick-row__arrow">›</span>
          </button>
          <button type="button" class="pick-row" @click="showKdzsTemplate = true">
            <div class="pick-row__badge carrier">模</div>
            <div class="pick-row__body">
              <div class="pick-row__label">快递模板</div>
              <div v-if="kdzsTemplateView" class="pick-row__title">{{ kdzsTemplateView.templateName }}</div>
              <div v-else class="muted">点击选择模板</div>
              <div v-if="kdzsTemplateView" class="muted pick-row__sub">
                {{
                  [kdzsTemplateView.carrierName, kdzsTemplateView.platform, kdzsTemplateView.shopName]
                    .filter(Boolean)
                    .join(' · ')
                }}
              </div>
            </div>
            <span class="pick-row__arrow">›</span>
          </button>
          <div class="muted tip">
            任务下发到在线电脑；扩展自动勾选、按配置打印机打印并发货。
            <button type="button" class="link-inline" @click="router.push('/kdzs-print')">绑定/打印机</button>
            <span v-if="kdzsPrinterName" class="muted"> · 打印机 {{ kdzsPrinterName }}</span>
            <span v-else class="muted"> · 未配置打印机名</span>
          </div>
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

    <van-popup v-model:show="showKdzsDevice" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择打单电脑</div>
        <button
          v-for="d in kdzsDevices"
          :key="d.id"
          type="button"
          class="option-card"
          :class="{ active: kdzsDeviceId === d.id }"
          @click="pickKdzsDevice(d.id)"
        >
          <div class="option-card__title">
            {{ d.name }}
            <span class="mini-tag" :class="d.online ? '' : 'mini-tag--off'">{{ d.online ? '在线' : '离线' }}</span>
          </div>
          <div class="muted">{{ d.deviceKey }}</div>
        </button>
        <div v-if="!kdzsDevices.length" class="muted pad">
          暂无绑定设备，请先
          <button type="button" class="link-inline" @click="router.push('/kdzs-print')">去绑定</button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showKdzsTemplate" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet sheet--company">
        <div class="sheet-title">选择快递模板</div>
        <van-search v-model="kdzsTemplateKeyword" placeholder="搜索模板名 / 快递 / 店铺" shape="round" />
        <div class="company-list">
          <button
            v-for="t in filteredKdzsTemplates"
            :key="t.id || t.templateId"
            type="button"
            class="option-card"
            :class="{ active: kdzsTemplateKey === templateKey(t) }"
            @click="pickKdzsTemplate(t)"
          >
            <div class="option-card__title">{{ t.templateName || t.templateId }}</div>
            <div class="muted">
              {{ [t.carrierName, t.platform, t.shopName].filter(Boolean).join(' · ') || t.templateId }}
            </div>
          </button>
          <div v-if="!filteredKdzsTemplates.length" class="muted pad">无匹配模板（可在发货中心同步快递助手模板）</div>
        </div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="showSplit"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      style="height: 85%"
      safe-area-inset-bottom
    >
      <div class="sheet split-sheet">
        <div class="sheet-title">拆分发货 — {{ order?.orderNo || '' }}</div>
        <van-radio-group
          :model-value="splitEditMode"
          direction="horizontal"
          class="mode-radios"
          @update:model-value="onSplitEditModeChange"
        >
          <van-radio name="partial">按商品拆分</van-radio>
          <van-radio name="full">整单拆分</van-radio>
        </van-radio-group>
        <div class="muted tip tip--inline">
          <template v-if="splitEditMode === 'full'">
            整单拆分：只填规格名称；保存后打单全部按这些规格行勾选。
          </template>
          <template v-else>
            对需要拆分的商品点「加拆分」；未拆分的商品打单时仍按原行勾选。
          </template>
        </div>

        <div v-if="splitEditMode === 'full'" class="split-block">
          <div class="split-block__hd">
            <span>拆分规格</span>
            <button type="button" class="link-btn" @click="addFullSplitDraftLine">加拆分</button>
          </div>
          <div v-for="line in splitDraftLines" :key="line.key" class="split-line">
            <van-field v-model="line.skuName" placeholder="规格名称" clearable />
            <van-stepper v-model="line.qty" :min="1" integer button-size="22px" />
            <button type="button" class="link-btn link-btn--danger" @click="removeSplitDraftLine(line.key)">删</button>
          </div>
          <div v-if="!splitDraftLines.length" class="muted tip tip--inline">点击「加拆分」添加规格</div>
        </div>

        <div v-else class="split-block">
          <div
            v-for="(item, index) in splitRootItems"
            :key="item.id || index"
            class="split-item"
          >
            <div class="split-item__hd">
              <img
                v-if="item.picUrl"
                class="pic-preview"
                :src="item.picUrl"
                alt=""
                @click.stop="previewProductImage(item.picUrl, splitRootItems.map((g) => g.picUrl))"
              />
              <div class="split-item__name">{{ item.skuSpecs || item.productName || '商品' }} ×{{ item.quantity || 1 }}</div>
              <button
                v-if="item.id"
                type="button"
                class="link-btn"
                @click="addSplitDraftLine(index, item.id!)"
              >
                加拆分
              </button>
              <button
                v-if="splitDraftLinesForItem(index).length"
                type="button"
                class="link-btn link-btn--danger"
                @click="clearSplitDraftForItem(index)"
              >
                取消
              </button>
            </div>
            <div
              v-for="line in splitDraftLinesForItem(index)"
              :key="line.key"
              class="split-line"
            >
              <van-field v-model="line.skuName" placeholder="规格名称" clearable />
              <van-stepper v-model="line.qty" :min="1" integer button-size="22px" />
              <button type="button" class="link-btn link-btn--danger" @click="removeSplitDraftLine(line.key)">删</button>
            </div>
          </div>
        </div>

        <div class="split-sheet__foot">
          <van-button block round :loading="splitSaving" type="primary" @click="saveSplitPlan">保存拆分</van-button>
        </div>
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
  type ExpressTemplate,
  type KdzsPrintDevice,
  type OMSOrder,
  type ShipperProfile,
  type ShipPlanLine,
} from '../api/shipping'
import {
  findExpressCompany,
  normalizeExpressNo,
  searchExpressCompanies,
  validateExpressNo,
  type ExpressCompany,
} from '../utils/expressWaybill'
import {
  buildShipPickRows,
  buildShipPickSnapshot,
  goodsCargoName,
  healShipPlanLines,
  readLastCarrierId,
  readLastShipperId,
  rematchPlanParentId,
  rememberShipPrefs,
  rootOMSItems,
  saveSFOrderHandoff,
} from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'
import { readKdzsPrinterName } from '../utils/kdzsPrinter'
import { previewProductImage } from '../utils/previewProductImage'

type ShipPickRow = ReturnType<typeof buildShipPickRows>[number]
type SplitDraftLine = {
  key: string
  itemIndex: number
  orderItemId: number
  skuName: string
  qty: number
}

const route = useRoute()
const router = useRouter()
const order = ref<OMSOrder | null>(null)
const loading = ref(true)
const submitting = ref(false)
const shipPickRows = ref<ShipPickRow[]>([])
const selectedKeys = ref<string[]>([])
const pendingShipPlanLines = ref<ShipPlanLine[]>([])
const carriers = ref<CarrierAccount[]>([])
const shippers = ref<ShipperProfile[]>([])
const carrierAccountId = ref<number | undefined>()
const shipperProfileId = ref<number | undefined>()
const shipMode = ref<'manual' | 'print' | 'kdzs'>('manual')
const sfAction = ref<'standard' | 'quick'>('standard')
const showCarrier = ref(false)
const showShipper = ref(false)
const showCompany = ref(false)
const showKdzsDevice = ref(false)
const showKdzsTemplate = ref(false)
const showSplit = ref(false)
const splitSaving = ref(false)
const splitEditMode = ref<'partial' | 'full'>('partial')
const splitDraftLines = ref<SplitDraftLine[]>([])
let splitDraftSeq = 0

const EXPRESS_TYPE_KEY = 'shippingcore.sf.expressType'
const EXPRESS_COMPANY_KEY = 'opsmobile.ship.expressCompany'
const EXPRESS_COMPANY_CODE_KEY = 'opsmobile.ship.expressCompanyCode'
const KDZS_DEVICE_KEY = 'opsmobile.kdzs.deviceId'
const KDZS_TEMPLATE_KEY = 'opsmobile.kdzs.templateKey'

const kdzsDevices = ref<KdzsPrintDevice[]>([])
const kdzsTemplates = ref<ExpressTemplate[]>([])
const kdzsDeviceId = ref<number | undefined>()
const kdzsTemplateKey = ref('')
const kdzsTemplateKeyword = ref('')
const kdzsPrinterName = ref(readKdzsPrinterName())

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

const pendingPlanCount = computed(
  () => pendingShipPlanLines.value.filter((l) => l.status === 'pending').length,
)

const selectedPickRows = computed(() =>
  shipPickRows.value.filter((r) => selectedKeys.value.includes(r.key)),
)

const splitRootItems = computed(() => (order.value ? rootOMSItems(order.value) : []))

const allSelected = computed(
  () => shipPickRows.value.length > 0 && selectedKeys.value.length === shipPickRows.value.length,
)
const indeterminate = computed(
  () => selectedKeys.value.length > 0 && selectedKeys.value.length < shipPickRows.value.length,
)

const carrierView = computed(
  () => carriers.value.find((x) => x.id === carrierAccountId.value) || null,
)
const shipperView = computed(
  () => shippers.value.find((x) => x.id === shipperProfileId.value) || null,
)
const kdzsDeviceView = computed(
  () => kdzsDevices.value.find((x) => x.id === kdzsDeviceId.value) || null,
)
const kdzsTemplateView = computed(
  () => kdzsTemplates.value.find((t) => templateKey(t) === kdzsTemplateKey.value) || null,
)
const filteredKdzsTemplates = computed(() => {
  const kw = kdzsTemplateKeyword.value.trim().toLowerCase()
  const list = kdzsTemplates.value
  if (!kw) return list
  return list.filter((t) =>
    [t.templateName, t.templateId, t.carrierName, t.platform, t.shopName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(kw),
  )
})

const canSubmit = computed(() => {
  if (!order.value || selectedKeys.value.length === 0) return false
  if (shipMode.value === 'manual') {
    return (
      !!expressCompany.value.trim() &&
      !!expressNo.value.trim() &&
      !expressNoError.value
    )
  }
  if (shipMode.value === 'kdzs') {
    return !!kdzsDeviceId.value && !!kdzsTemplateView.value
  }
  return !!carrierAccountId.value && !!shipperProfileId.value
})

const primaryLabel = computed(() => {
  if (shipMode.value === 'manual') return '确认发货'
  if (shipMode.value === 'kdzs') return '发送到电脑打单'
  if (sfAction.value === 'standard') return '前往标准寄件'
  return '快速下单打印'
})

function templateKey(t: ExpressTemplate) {
  return String(t.templateId || t.id || t.templateName || '')
}

function orderPlatformCode(o?: OMSOrder | null): string {
  const code = (o?.platform || '').trim().toUpperCase()
  if (code === 'DY') return 'FXG'
  if (code === 'HAND' || code === 'MANUAL') return 'DFHAND'
  return code || 'FXG'
}

function buildKdzsOrderTimeRange(o: OMSOrder): { from: string; to: string } | null {
  const raw = o.payTime || o.orderedAt
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const p = (n: number) => String(n).padStart(2, '0')
  const ymd = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  return { from: `${ymd} 00:00:00`, to: `${ymd} 23:59:59` }
}

function pickKdzsDevice(id: number) {
  kdzsDeviceId.value = id
  localStorage.setItem(KDZS_DEVICE_KEY, String(id))
  showKdzsDevice.value = false
}

function pickKdzsTemplate(t: ExpressTemplate) {
  const key = templateKey(t)
  kdzsTemplateKey.value = key
  localStorage.setItem(KDZS_TEMPLATE_KEY, key)
  showKdzsTemplate.value = false
}

const isPartialSelection = computed(
  () =>
    shipPickRows.value.length > 0 &&
    selectedKeys.value.length > 0 &&
    selectedKeys.value.length < shipPickRows.value.length,
)

function selectAllShippable() {
  selectedKeys.value = shipPickRows.value.map((r) => r.key)
}

function toggleAll() {
  if (allSelected.value) selectedKeys.value = []
  else selectAllShippable()
}

function toggleItem(key: string) {
  const cur = selectedKeys.value
  if (cur.includes(key)) {
    selectedKeys.value = cur.filter((k) => k !== key)
  } else {
    selectedKeys.value = [...cur, key]
  }
}

async function initShipPickSelection(o: OMSOrder) {
  try {
    const { list } = await shippingApi.getShipPlan(o.id, 'pending')
    pendingShipPlanLines.value = healShipPlanLines(o, list || [])
  } catch {
    pendingShipPlanLines.value = []
  }
  shipPickRows.value = buildShipPickRows(o, pendingShipPlanLines.value)
  selectedKeys.value = shipPickRows.value.map((r) => r.key)
}

function buildSnapshot() {
  if (!order.value) return null
  if (!selectedPickRows.value.length) {
    showFailToast('请先勾选要发货的商品')
    return null
  }
  for (const r of selectedPickRows.value) {
    if (!(r.skuName || '').trim()) {
      showFailToast('发货规格名称不能为空')
      return null
    }
    if (!(r.orderItemId > 0)) {
      showFailToast('拆分规格尚未同步订单中心子行，请重新保存拆分后再打单')
      return null
    }
    const maxQty = Math.max(1, r.maxQty || 1)
    if (!(r.shipQty > 0) || r.shipQty > maxQty) {
      showFailToast(`发货件数须在 1～${maxQty} 之间`)
      return null
    }
  }
  try {
    const snapshot = buildShipPickSnapshot(order.value, selectedPickRows.value)
    if (!snapshot.goods.length) {
      showFailToast('没有可发商品，请刷新订单后重试')
      return null
    }
    return snapshot
  } catch (e) {
    showFailToast((e as Error).message || '生成发货快照失败')
    return null
  }
}

function splitDraftLinesForItem(itemIndex: number) {
  return splitDraftLines.value.filter((l) => l.itemIndex === itemIndex)
}

function addSplitDraftLine(itemIndex: number, orderItemId: number) {
  splitDraftSeq += 1
  splitDraftLines.value.push({
    key: `d${splitDraftSeq}`,
    itemIndex,
    orderItemId,
    skuName: '',
    qty: 1,
  })
}

function addFullSplitDraftLine() {
  addSplitDraftLine(-1, 0)
}

function removeSplitDraftLine(key: string) {
  splitDraftLines.value = splitDraftLines.value.filter((l) => l.key !== key)
}

function clearSplitDraftForItem(itemIndex: number) {
  splitDraftLines.value = splitDraftLines.value.filter((l) => l.itemIndex !== itemIndex)
}

function onSplitEditModeChange(mode: string | number) {
  const next = mode === 'full' ? 'full' : 'partial'
  if (next === splitEditMode.value) return
  splitEditMode.value = next
  splitDraftLines.value = []
  splitDraftSeq = 0
  if (next === 'full') addFullSplitDraftLine()
}

async function openSplitEdit() {
  if (!order.value) return
  splitDraftLines.value = []
  splitDraftSeq = 0
  splitEditMode.value = 'partial'
  try {
    const { list } = await shippingApi.getShipPlan(order.value.id)
    const pending = healShipPlanLines(order.value, (list || []).filter((l) => l.status === 'pending'))
    const isFull = pending.length > 0 && pending.every((l) => !l.orderItemId)
    splitEditMode.value = isFull ? 'full' : 'partial'
    const roots = rootOMSItems(order.value)
    let needsPersistHeal = false
    for (const line of pending) {
      if (isFull || !line.orderItemId) {
        splitDraftSeq += 1
        splitDraftLines.value.push({
          key: `d${splitDraftSeq}`,
          itemIndex: -1,
          orderItemId: 0,
          skuName: line.skuName,
          qty: Math.max(1, line.qty || 1),
        })
        continue
      }
      const rawId = Number(line.orderItemId || 0)
      const parentId = rematchPlanParentId(order.value, rawId, line.splitOrderItemId)
      const itemIndex = roots.findIndex((it) => it.id === parentId)
      if (itemIndex < 0 || !parentId) continue
      if (parentId !== rawId) needsPersistHeal = true
      splitDraftSeq += 1
      splitDraftLines.value.push({
        key: `d${splitDraftSeq}`,
        itemIndex,
        orderItemId: parentId,
        skuName: line.skuName,
        qty: Math.max(1, line.qty || 1),
      })
    }
    if (needsPersistHeal && splitDraftLines.value.length && splitEditMode.value === 'partial') {
      try {
        await shippingApi.putShipPlan(
          order.value.id,
          splitDraftLines.value.map((l, i) => ({
            orderItemId: l.orderItemId,
            skuName: l.skuName.trim(),
            qty: l.qty,
            sortNo: i + 1,
          })),
        )
        await initShipPickSelection(order.value)
      } catch {
        /* 展示草稿优先 */
      }
    }
  } catch (e) {
    showFailToast((e as Error).message || '加载拆分计划失败')
    return
  }
  showSplit.value = true
}

async function saveSplitPlan() {
  if (!order.value) return
  for (const line of splitDraftLines.value) {
    if (!line.skuName.trim()) {
      showFailToast('请填写规格名称')
      return
    }
    if (line.qty <= 0) {
      showFailToast('拆分行数量须大于 0')
      return
    }
    if (splitEditMode.value === 'partial' && !line.orderItemId) {
      showFailToast('按商品拆分请为每行关联原商品')
      return
    }
  }
  splitSaving.value = true
  try {
    const full = splitEditMode.value === 'full'
    await shippingApi.putShipPlan(
      order.value.id,
      splitDraftLines.value.map((l, i) => ({
        orderItemId: full ? 0 : l.orderItemId,
        skuName: l.skuName.trim(),
        qty: l.qty,
        sortNo: i + 1,
      })),
    )
    showSuccessToast(
      splitDraftLines.value.length
        ? full
          ? '整单拆分已保存'
          : '拆分计划已保存'
        : '已取消拆分',
    )
    showSplit.value = false
    order.value = await loadOrder(order.value.id)
    await initShipPickSelection(order.value)
  } catch (e) {
    showFailToast((e as Error).message || '保存拆分失败')
  } finally {
    splitSaving.value = false
  }
}

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

watch(shipMode, (mode) => {
  if (mode === 'kdzs') kdzsPrinterName.value = readKdzsPrinterName()
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
    try {
      return await getOmsOrder(hit.id)
    } catch {
      return hit
    }
  }
}

async function loadOptions() {
  const [cRes, sRes, dRes, tRes] = await Promise.all([
    shippingApi.listCarrierAccounts({ page: 1, pageSize: 100, enabled: true }),
    shippingApi.listShipperProfiles({ page: 1, pageSize: 100, enabled: true }),
    shippingApi.listKdzsPrintDevices().catch(() => ({ list: [] as KdzsPrintDevice[], total: 0 })),
    shippingApi
      .listExpressTemplates({ page: 1, pageSize: 200 })
      .catch(() => ({ list: [] as ExpressTemplate[], total: 0, page: 1, pageSize: 200 })),
  ])
  const all = (cRes.list || []).filter((c) => c.enabled !== false)
  const sf = all.filter((c) => /sf|顺丰/i.test(`${c.carrierCode || ''}${c.name || ''}`))
  carriers.value = sf.length ? sf : all
  shippers.value = (sRes.list || []).filter((s) => s.enabled !== false)
  kdzsDevices.value = dRes.list || []
  kdzsTemplates.value = (tRes.list || []).filter((t) => t.enabled !== false)

  const lastC = readLastCarrierId()
  const lastS = readLastShipperId()
  carrierAccountId.value =
    carriers.value.find((c) => c.id === lastC)?.id || carriers.value[0]?.id
  shipperProfileId.value =
    shippers.value.find((s) => s.id === lastS)?.id ||
    shippers.value.find((s) => s.isDefault)?.id ||
    shippers.value[0]?.id

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
  }
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

async function goKdzsPrint() {
  if (!order.value || !kdzsDeviceId.value) return
  const snapshot = buildSnapshot()
  if (!snapshot) return
  const device = kdzsDeviceView.value
  if (!device) {
    showFailToast('请选择打单电脑')
    return
  }
  if (!device.online) {
    showFailToast('电脑离线，请确认扩展已打开并保持心跳')
    return
  }
  const tpl = kdzsTemplateView.value
  if (!tpl?.templateName && !tpl?.templateId) {
    showFailToast('请选择快递模板')
    return
  }
  const printer = readKdzsPrinterName()
  kdzsPrinterName.value = printer
  if (!printer) {
    showFailToast('请先在「快递助手插件」页填写完整打印机名称')
    await router.push('/kdzs-print')
    return
  }
  // 手工单必须有快递助手系统编号/订单编号，否则插件无法精确勾选（会误打别的单）
  const plat = orderPlatformCode(order.value)
  const sysTid = (order.value.platformSysTid || '').trim()
  const platOid = (order.value.platformOrderId || '').trim()
  if (plat === 'DFHAND' && !sysTid && !platOid) {
    showFailToast('该手工单尚未同步快递助手编号，请先在「新建手工单」推送成功后再打单')
    return
  }
  const timeRange = buildKdzsOrderTimeRange(order.value)
  const payload: Record<string, unknown> = {
    v: 1,
    createdAt: Date.now(),
    platform: orderPlatformCode(order.value),
    templateName: tpl.templateName || '',
    templateId: tpl.templateId,
    printerName: printer,
    orders: [
      {
        orderNo: order.value.orderNo || '',
        platformSysTid: order.value.platformSysTid || '',
        platformOrderId: order.value.platformOrderId || '',
        sysTid: order.value.platformSysTid || '',
        tid: order.value.platformOrderId || '',
        payTime: order.value.payTime || '',
        orderedAt: order.value.orderedAt || '',
        goods: (snapshot.goods || []).map((g) => {
          const name = (g.skuName || g.title || '').trim()
          return {
            title: name,
            skuName: name,
            outerId: g.outerId,
            num: g.num,
          }
        }),
      },
    ],
    orderTimeFrom: timeRange?.from,
    orderTimeTo: timeRange?.to,
    autoPrint: true,
  }
  submitting.value = true
  try {
    localStorage.setItem(KDZS_DEVICE_KEY, String(kdzsDeviceId.value))
    if (kdzsTemplateKey.value) localStorage.setItem(KDZS_TEMPLATE_KEY, kdzsTemplateKey.value)
    const task = await shippingApi.createKdzsPrintTask({
      deviceId: kdzsDeviceId.value,
      payload,
    })
    showSuccessToast(`已下发任务 #${task.id}，电脑将自动勾选订单`)
    await router.replace('/pending')
  } catch (e) {
    showFailToast((e as Error).message || '下发失败')
  } finally {
    submitting.value = false
  }
}

async function submit() {
  if (!order.value || selectedKeys.value.length === 0) {
    showFailToast('请先勾选要发货的商品')
    return
  }
  if (shipMode.value === 'manual') {
    await goManualShip()
    return
  }
  if (shipMode.value === 'kdzs') {
    await goKdzsPrint()
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
  kdzsPrinterName.value = readKdzsPrinterName()
  const id = Number(route.params.orderId)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    await loadOptions()
    order.value = id ? await loadOrder(id) : null
    if (order.value) await initShipPickSelection(order.value)
    if (route.query.split === '1' && order.value) {
      await openSplitEdit()
    }
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.link-btn {
  border: 0;
  background: transparent;
  padding: 0;
  color: var(--ops-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.link-btn--danger {
  color: #dc2626;
}
.tag-split {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #047857;
  background: #d1fae5;
  padding: 1px 6px;
  border-radius: 999px;
  vertical-align: middle;
}
.goods-row--pick {
  align-items: flex-start;
}
.goods-row__check {
  border: 0;
  background: transparent;
  padding: 0;
  margin-top: 2px;
  cursor: pointer;
}
.qty-edit {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
}
.split-sheet {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: auto;
  padding-bottom: 72px;
}
.split-block {
  margin-top: 8px;
}
.split-block__hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 8px;
}
.split-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.split-item__hd {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.split-item__hd img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
}
.split-item__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
}
.split-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.split-line :deep(.van-field) {
  flex: 1;
  padding: 4px 8px;
  background: #f5f6f8;
  border-radius: 8px;
}
.split-sheet__foot {
  position: sticky;
  bottom: 0;
  margin-top: 12px;
  padding: 8px 0 calc(8px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, #fff 28%);
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
  gap: 12px 16px !important;
  flex-wrap: wrap;
}
.mode-radios--wrap :deep(.van-radio) {
  margin-right: 0;
}
.link-inline {
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-size: inherit;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
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
.mini-tag--off {
  color: #b45309;
  background: #fff7ed;
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
