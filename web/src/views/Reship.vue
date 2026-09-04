<template>
  <div class="page">
    <van-nav-bar
      class="ops-nav"
      :title="step === 'edit' ? '重新发货 · 确认信息' : '重新发货 · 打单'"
      left-arrow
      @click-left="onBack"
    />

    <div class="page-body" v-if="order && source">
      <van-notice-bar
        class="ops-notice"
        left-icon="info-o"
        background="rgba(245, 158, 11, 0.12)"
        color="#b45309"
        :text="`原运单 ${source.mailNo || '-'} 保留；不新建订单，新单号追加到原订单发货记录`"
      />

      <!-- 第一步：确认/编辑地址与商品 -->
      <template v-if="step === 'edit'">
        <div class="section-label">智能填单</div>
        <div class="card">
          <van-field
            v-model="draft.pasteText"
            rows="3"
            autosize
            type="textarea"
            label="粘贴地址"
            placeholder="姓名 手机 省市区详细地址"
          />
          <van-button block type="primary" plain class="parse-btn" @click="applyPaste">
            一键填充
          </van-button>
        </div>

        <div class="section-label">收件信息</div>
        <div class="card">
          <van-field v-model="draft.receiverName" label="收件人" required placeholder="姓名" />
          <van-field v-model="draft.receiverMobile" label="手机" required placeholder="手机号" />
          <van-field v-model="draft.receiverProvince" label="省" placeholder="省" />
          <van-field v-model="draft.receiverCity" label="市" placeholder="市" />
          <van-field v-model="draft.receiverCounty" label="区" placeholder="区/县" />
          <van-field
            v-model="draft.receiverAddress"
            rows="2"
            autosize
            type="textarea"
            label="详细地址"
            required
            placeholder="街道门牌"
          />
        </div>

        <div class="section-label">商品（可改/可加，仅本次面单）</div>
        <div class="card">
          <div v-for="(g, idx) in goods" :key="g.key" class="item-block">
            <van-field v-model="g.productName" label="商品" placeholder="商品名称" />
            <van-field v-model="g.skuSpecs" label="规格" placeholder="面单托寄物优先规格" />
            <div class="item-row">
              <van-field v-model="g.outerId" label="编码" placeholder="可选" />
              <van-field v-model.number="g.quantity" type="digit" label="数量" />
            </div>
            <van-button
              v-if="goods.length > 1"
              size="small"
              plain
              hairline
              type="danger"
              block
              @click="removeGoods(idx)"
            >
              删除本行
            </van-button>
          </div>
          <van-button block type="primary" plain icon="plus" @click="addGoods">加一行</van-button>
        </div>

        <div class="footer-safe">
          <van-button type="primary" block round :loading="loading" @click="goShipStep">
            下一步：打单发货
          </van-button>
        </div>
      </template>

      <!-- 第二步：打单方式 -->
      <template v-else>
        <div class="section-label">本次寄件摘要</div>
        <div class="card summary">
          <div>
            <strong>{{ draft.receiverName }}</strong> {{ draft.receiverMobile }}
          </div>
          <div class="muted">
            {{
              [
                draft.receiverProvince,
                draft.receiverCity,
                draft.receiverCounty,
                draft.receiverAddress,
              ]
                .filter(Boolean)
                .join('')
            }}
          </div>
          <div v-for="g in goods.filter((x) => (x.skuSpecs || x.productName).trim())" :key="g.key" class="muted">
            {{ (g.skuSpecs || g.productName).trim() }} ×{{ g.quantity }}
          </div>
          <van-button size="small" plain hairline type="primary" @click="step = 'edit'">
            返回修改
          </van-button>
        </div>

        <div class="section-label">发货方式</div>
        <div class="card">
          <van-radio-group v-model="shipMode" direction="horizontal" class="mode-radios">
            <van-radio name="print">自建物流</van-radio>
            <van-radio name="manual">回填单号</van-radio>
            <van-radio name="kdzs">快递助手</van-radio>
          </van-radio-group>
          <div class="muted tip">默认按手工单追加包裹；不取消原运单</div>
        </div>

        <template v-if="shipMode === 'manual'">
          <div class="section-label">新运单</div>
          <div class="card pick-card">
            <button type="button" class="pick-row" @click="showCompany = true">
              <div class="pick-row__badge carrier">运</div>
              <div class="pick-row__body">
                <div class="pick-row__label">物流公司</div>
                <div v-if="expressCompany" class="pick-row__title">{{ expressCompany }}</div>
                <div v-else class="muted">点击选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
            <van-field
              v-model="expressNo"
              label="新运单号"
              placeholder="勿填原运单号"
              clearable
              maxlength="40"
            />
          </div>
        </template>

        <template v-else-if="shipMode === 'kdzs'">
          <div class="section-label">快递助手（手工单）</div>
          <div class="card pick-card">
            <button type="button" class="pick-row" @click="showKdzsDevice = true">
              <div class="pick-row__badge ship">机</div>
              <div class="pick-row__body">
                <div class="pick-row__label">打单电脑（Agent）</div>
                <div v-if="kdzsDeviceView" class="pick-row__title">
                  {{ kdzsDeviceView.name }}
                  <span class="mini-tag" :class="kdzsDeviceView.online ? '' : 'mini-tag--off'">
                    {{ kdzsDeviceView.online ? '在线' : '离线' }}
                  </span>
                </div>
                <div v-else class="muted">点击选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
            <button type="button" class="pick-row" @click="showKdzsTemplate = true">
              <div class="pick-row__badge carrier">模</div>
              <div class="pick-row__body">
                <div class="pick-row__label">菜鸟模板</div>
                <div v-if="kdzsTemplateView" class="pick-row__title">{{ kdzsTemplateView.templateName }}</div>
                <div v-else class="muted">点击选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
            <div class="muted tip">
              下发后 WindowsAgent 按手工单打面单；完成后在下方回填新运单号。
              <button type="button" class="link-inline" @click="router.push('/kdzs-print')">远程打单设置</button>
            </div>
            <van-field
              v-model="expressNo"
              label="新运单号"
              placeholder="打单完成后填写"
              clearable
              maxlength="40"
            />
            <button type="button" class="pick-row" @click="showCompany = true">
              <div class="pick-row__badge carrier">运</div>
              <div class="pick-row__body">
                <div class="pick-row__label">物流公司</div>
                <div v-if="expressCompany" class="pick-row__title">{{ expressCompany }}</div>
                <div v-else class="muted">回填时选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
          </div>
        </template>

        <template v-else>
          <div class="section-label">自建物流</div>
          <div class="card pick-card">
            <button type="button" class="pick-row" @click="showShipper = true">
              <div class="pick-row__badge ship">寄</div>
              <div class="pick-row__body">
                <div class="pick-row__label">寄件人</div>
                <div v-if="shipperView" class="pick-row__title">{{ shipperView.name }}</div>
                <div v-else class="muted">点击选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
            <button type="button" class="pick-row" @click="showCarrier = true">
              <div class="pick-row__badge carrier">账</div>
              <div class="pick-row__body">
                <div class="pick-row__label">物流账号</div>
                <div v-if="carrierView" class="pick-row__title">{{ carrierView.name }}</div>
                <div v-else class="muted">点击选择</div>
              </div>
              <span class="pick-row__arrow">›</span>
            </button>
            <van-radio-group v-model="sfAction" direction="horizontal" class="mode-radios">
              <van-radio name="standard">标准寄件</van-radio>
              <van-radio name="quick">快速下单打印</van-radio>
            </van-radio-group>
          </div>
        </template>

        <div class="footer-safe">
          <van-button type="primary" block round :loading="submitting" @click="submit">
            {{ primaryLabel }}
          </van-button>
        </div>
      </template>
    </div>
    <van-empty v-else-if="!loading" description="无法重新发货" />

    <van-popup v-model:show="showCarrier" position="bottom" round teleport="body" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择物流账号</div>
        <button
          v-for="c in carriers"
          :key="c.id"
          type="button"
          class="option-card"
          @click="carrierAccountId = c.id; showCarrier = false"
        >
          <div class="option-card__title">{{ c.name }}</div>
        </button>
      </div>
    </van-popup>
    <van-popup v-model:show="showShipper" position="bottom" round teleport="body" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择寄件人</div>
        <button
          v-for="s in shippers"
          :key="s.id"
          type="button"
          class="option-card"
          @click="shipperProfileId = s.id; showShipper = false"
        >
          <div class="option-card__title">{{ s.isDefault ? `${s.name}（默认）` : s.name }}</div>
        </button>
      </div>
    </van-popup>
    <van-popup v-model:show="showCompany" position="bottom" round teleport="body" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">选择物流公司</div>
        <van-search v-model="companyKeyword" placeholder="搜索公司" shape="round" />
        <button
          v-for="c in filteredCompanies"
          :key="c.code"
          type="button"
          class="option-card"
          @click="pickCompany(c)"
        >
          <div class="option-card__title">{{ c.name }}</div>
        </button>
      </div>
    </van-popup>
    <van-popup v-model:show="showKdzsDevice" position="bottom" round teleport="body" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">打单电脑（Agent）</div>
        <button
          v-for="d in kdzsDevices"
          :key="d.id"
          type="button"
          class="option-card"
          @click="kdzsDeviceId = d.id; showKdzsDevice = false"
        >
          <div class="option-card__title">
            {{ d.name }}
            <span class="mini-tag" :class="d.online ? '' : 'mini-tag--off'">{{ d.online ? '在线' : '离线' }}</span>
          </div>
        </button>
        <div v-if="!kdzsDevices.length" class="muted pad">暂无绑定电脑，请先在「快递助手远程打单」配对 Agent</div>
      </div>
    </van-popup>
    <van-popup v-model:show="showKdzsTemplate" position="bottom" round teleport="body" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">菜鸟快递模板</div>
        <button
          v-for="t in kdzsTemplates"
          :key="t.templateId || t.id"
          type="button"
          class="option-card"
          @click="kdzsTemplateKey = t.templateId || ''; showKdzsTemplate = false"
        >
          <div class="option-card__title">{{ t.templateName }}</div>
        </button>
        <div v-if="!kdzsTemplates.length" class="muted pad">暂无菜鸟模板，请先在发货中心同步</div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  shippingApi,
  type CarrierAccount,
  type ExpressTemplate,
  type KdzsPrintDevice,
  type OMSOrder,
  type OrderSnapshot,
  type ShipperProfile,
  type Shipment,
} from '../api/shipping'
import {
  extractAddressBody,
  goodsCargoName,
  parseChineseRegion,
  parsePastedContact,
  rememberShipPrefs,
  saveSFOrderHandoff,
} from '../utils/sfOrderHandoff'
import { printShipmentByChannel } from '../utils/sfPrintLabel'
import { getSavedPrinterIndex, getSavedPrinterName } from '../utils/sfPrintPlugin'
import { readKdzsPrinterName } from '../utils/kdzsPrinter'
import { findExpressCompany, searchExpressCompanies, type ExpressCompany } from '../utils/expressWaybill'

const RESHIP_KDZS_PLATFORM = 'DFHAND'
const RESHIP_TEMPLATE_GROUP = '菜鸟'
const EXPRESS_TYPE_KEY = 'shippingcore.sf.expressType'
const EXPRESS_COMPANY_KEY = 'opsmobile.ship.expressCompany'
const EXPRESS_COMPANY_CODE_KEY = 'opsmobile.ship.expressCompanyCode'
const KDZS_DEVICE_KEY = 'opsmobile.kdzs.deviceId'
const KDZS_TEMPLATE_KEY = 'opsmobile.kdzs.templateKey'

type ReshipStep = 'edit' | 'ship'
type ShipMode = 'print' | 'manual' | 'kdzs'
type GoodsLine = {
  key: string
  orderItemId: number
  productName: string
  skuSpecs: string
  outerId: string
  quantity: number
}

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const submitting = ref(false)
const step = ref<ReshipStep>('edit')
const shipMode = ref<ShipMode>('print')
const sfAction = ref<'standard' | 'quick'>('quick')
const source = ref<Shipment | null>(null)
const order = ref<OMSOrder | null>(null)
const carriers = ref<CarrierAccount[]>([])
const shippers = ref<ShipperProfile[]>([])
const carrierAccountId = ref<number | undefined>()
const shipperProfileId = ref<number | undefined>()
const showCarrier = ref(false)
const showShipper = ref(false)
const showCompany = ref(false)
const showKdzsDevice = ref(false)
const showKdzsTemplate = ref(false)
const companyKeyword = ref('')
const expressCompany = ref('')
const expressCompanyCode = ref('')
const expressNo = ref('')
const kdzsDevices = ref<KdzsPrintDevice[]>([])
const kdzsTemplates = ref<ExpressTemplate[]>([])
const kdzsDeviceId = ref<number | undefined>()
const kdzsTemplateKey = ref('')

const draft = reactive({
  pasteText: '',
  receiverName: '',
  receiverMobile: '',
  receiverProvince: '',
  receiverCity: '',
  receiverCounty: '',
  receiverAddress: '',
})
const goods = ref<GoodsLine[]>([])

const filteredCompanies = computed(() => searchExpressCompanies(companyKeyword.value))
const carrierView = computed(() => carriers.value.find((c) => c.id === carrierAccountId.value) || null)
const shipperView = computed(() => shippers.value.find((s) => s.id === shipperProfileId.value) || null)
const kdzsDeviceView = computed(() => kdzsDevices.value.find((d) => d.id === kdzsDeviceId.value) || null)
const kdzsTemplateView = computed(
  () => kdzsTemplates.value.find((t) => t.templateId === kdzsTemplateKey.value) || null,
)

const primaryLabel = computed(() => {
  if (shipMode.value === 'manual') return '确认追加发货'
  if (shipMode.value === 'kdzs') {
    return expressNo.value.trim() ? '确认追加发货' : '下发电脑打单'
  }
  if (sfAction.value === 'standard') return '前往标准寄件'
  return '快速下单打印'
})

function emptyGoods(): GoodsLine {
  return {
    key: `g${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    orderItemId: 0,
    productName: '',
    skuSpecs: '',
    outerId: '',
    quantity: 1,
  }
}

function addGoods() {
  goods.value.push(emptyGoods())
}

function removeGoods(idx: number) {
  if (goods.value.length <= 1) {
    showFailToast('至少保留一行')
    return
  }
  goods.value.splice(idx, 1)
}

function onBack() {
  if (step.value === 'ship') {
    step.value = 'edit'
    return
  }
  router.back()
}

function applyPaste() {
  const raw = draft.pasteText.trim()
  if (!raw) {
    showFailToast('请先粘贴收件信息')
    return
  }
  const contact = parsePastedContact(raw)
  if (contact.name) draft.receiverName = contact.name
  if (contact.mobile) draft.receiverMobile = contact.mobile
  const addrRaw = (contact.address || raw).trim()
  const parsed = parseChineseRegion(addrRaw)
  if (parsed.province) draft.receiverProvince = parsed.province
  if (parsed.city) draft.receiverCity = parsed.city
  if (parsed.county) draft.receiverCounty = parsed.county
  if (parsed.address) draft.receiverAddress = parsed.address
  else if (addrRaw && !parsed.province) draft.receiverAddress = addrRaw
  showSuccessToast('已填充')
}

function prefill(o: OMSOrder, sh: Shipment) {
  const addr = o.address
  draft.receiverName = (addr?.name || o.buyerName || sh.receiverName || '').trim()
  draft.receiverMobile = (addr?.phone || o.buyerPhone || sh.receiverMobile || '').trim()
  let province = (addr?.province || sh.receiverProvince || '').trim()
  let city = (addr?.city || sh.receiverCity || '').trim()
  let county = (addr?.district || sh.receiverCounty || '').trim()
  let detail = (addr?.address || sh.receiverAddress || '').trim()
  const fullBody = extractAddressBody(addr?.fullText)
  if ((!province || !city || !county) && (fullBody || detail)) {
    const parsed = parseChineseRegion(fullBody || detail)
    if (!province) province = parsed.province
    if (!city) city = parsed.city
    if (!county) county = parsed.county
    if (parsed.province && parsed.address) {
      if (!detail || detail.length <= parsed.address.length) detail = parsed.address
    }
  }
  if (!detail) detail = fullBody || (addr?.fullText || '').trim() || sh.receiverAddress || ''
  draft.receiverProvince = province
  draft.receiverCity = city
  draft.receiverCounty = county
  draft.receiverAddress = detail
  draft.pasteText = [draft.receiverName, draft.receiverMobile, [province, city, county, detail].filter(Boolean).join('')]
    .filter(Boolean)
    .join(' ')

  const roots = (o.items || []).filter(
    (it) => !(it.splitKind || (it.parentOrderItemId && it.parentOrderItemId > 0)),
  )
  if (roots.length) {
    goods.value = roots.map((it) => ({
      key: `oi${it.id || 0}_${Math.random().toString(36).slice(2, 5)}`,
      orderItemId: it.id || 0,
      productName: (it.productName || '').trim(),
      skuSpecs: (it.skuSpecs || '').trim(),
      outerId: '',
      quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
    }))
  } else if (sh.items?.length) {
    goods.value = sh.items.map((it) => ({
      key: `si${it.id || 0}_${Math.random().toString(36).slice(2, 5)}`,
      orderItemId: it.orderItemId || 0,
      productName: (it.goodsName || '').trim(),
      skuSpecs: (it.skuCode || '').trim(),
      outerId: (it.outerId || '').trim(),
      quantity: it.quantity || 1,
    }))
  } else {
    const line = emptyGoods()
    line.productName = sh.cargoName || '商品'
    line.skuSpecs = sh.cargoName || '商品'
    goods.value = [line]
  }
}

function validateEdit(): boolean {
  if (!draft.receiverName.trim()) {
    showFailToast('请填写收件人')
    return false
  }
  if (!draft.receiverMobile.trim()) {
    showFailToast('请填写手机')
    return false
  }
  if (!draft.receiverAddress.trim() && !draft.receiverProvince.trim()) {
    showFailToast('请填写地址')
    return false
  }
  const lines = goods.value.filter((g) => (g.skuSpecs || g.productName || '').trim())
  if (!lines.length) {
    showFailToast('请至少填写一件商品')
    return false
  }
  return true
}

function buildSnapshot(o: OMSOrder): OrderSnapshot {
  return {
    platform: RESHIP_KDZS_PLATFORM,
    shopId: o.shopId || '',
    shopName: o.shopName || o.manualSourceName || '',
    sourceChannel: 'manual',
    manualSourceName: o.manualSourceName || o.shopName || '重新发货',
    orderNo: o.orderNo || '',
    sysTid: o.platformSysTid || '',
    sourceTid: o.platformOrderId || o.orderNo || '',
    receiverName: draft.receiverName.trim(),
    receiverMobile: draft.receiverMobile.trim(),
    receiverProvince: draft.receiverProvince.trim(),
    receiverCity: draft.receiverCity.trim(),
    receiverCounty: draft.receiverCounty.trim(),
    receiverAddress: draft.receiverAddress.trim(),
    goods: goods.value
      .filter((g) => (g.skuSpecs || g.productName || '').trim())
      .map((g) => {
        const product = g.productName.trim()
        const spec = g.skuSpecs.trim()
        return {
          orderItemId: g.orderItemId || 0,
          title: product || spec,
          skuName: spec || product,
          num: Math.max(1, Number(g.quantity) || 1),
          outerId: g.outerId.trim(),
          price: 0,
        }
      }),
  }
}

function goShipStep() {
  if (!validateEdit()) return
  step.value = 'ship'
}

function pickCompany(c: ExpressCompany) {
  expressCompany.value = c.name
  expressCompanyCode.value = c.code
  localStorage.setItem(EXPRESS_COMPANY_KEY, c.name)
  localStorage.setItem(EXPRESS_COMPANY_CODE_KEY, c.code)
  showCompany.value = false
}

async function confirmExpressAppend() {
  const o = order.value
  if (!o) return
  const no = expressNo.value.trim()
  const company = expressCompany.value.trim()
  if (!company) {
    showFailToast('请选择物流公司')
    return
  }
  if (!no) {
    showFailToast('请填写新运单号')
    return
  }
  const oldNo = (source.value?.mailNo || '').trim()
  if (oldNo && no === oldNo) {
    showFailToast('新运单号不能与原运单号相同')
    return
  }
  submitting.value = true
  try {
    const shipment = await shippingApi.confirmKdzsShip({
      orderId: o.id,
      expressNo: no,
      expressCompany: company,
      reship: true,
      order: buildSnapshot(o),
    })
    showSuccessToast('已追加发货记录')
    await router.replace(shipment?.id ? `/shipped/${shipment.id}` : '/shipped')
  } catch (e) {
    showFailToast((e as Error).message || '确认失败')
  } finally {
    submitting.value = false
  }
}

async function goKdzsTask() {
  const o = order.value
  if (!o || !kdzsDeviceId.value) {
    showFailToast('请选择打单电脑（Agent）')
    return
  }
  const device = kdzsDeviceView.value
  if (!device?.online) {
    showFailToast('电脑离线，请确认 WindowsAgent 在线')
    return
  }
  const tpl = kdzsTemplateView.value
  if (!tpl) {
    showFailToast('请选择菜鸟模板')
    return
  }
  const printer = readKdzsPrinterName()
  // 可不填：优先 Agent 任务默认打印机；都空则用弹窗当前默认
  const snap = buildSnapshot(o)
  const payload: Record<string, unknown> = {
    v: 1,
    createdAt: Date.now(),
    platform: RESHIP_KDZS_PLATFORM,
    templateName: tpl.templateName || '',
    templateId: tpl.templateId,
    printerName: printer || '',
    orders: [
      {
        orderNo: o.orderNo || '',
        platformSysTid: '',
        platformOrderId: '',
        sysTid: '',
        tid: '',
        payTime: o.payTime || '',
        orderedAt: o.orderedAt || '',
        goods: (snap.goods || []).map((g) => {
          const name = (g.skuName || g.title || '').trim()
          return { title: name, skuName: name, outerId: g.outerId, num: g.num }
        }),
      },
    ],
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
    showSuccessToast(`已下发任务 #${task.id}，打完后填写新运单号确认`)
  } catch (e) {
    showFailToast((e as Error).message || '下发失败')
  } finally {
    submitting.value = false
  }
}

async function goStandard() {
  const o = order.value
  if (!o) return
  rememberShipPrefs(carrierAccountId.value, shipperProfileId.value)
  saveSFOrderHandoff({
    orderId: o.id,
    sourceSystem: 'ordercore',
    carrierAccountId: carrierAccountId.value,
    shipperProfileId: shipperProfileId.value,
    reship: true,
    order: buildSnapshot(o),
  })
  await router.push('/sf-order')
}

async function goQuick() {
  const o = order.value
  if (!o || !carrierAccountId.value || !shipperProfileId.value) {
    showFailToast('请选择物流账号和寄件人')
    return
  }
  const printerIndex = getSavedPrinterIndex()
  const carrier = carrierView.value
  const channel = (carrier?.printChannel || 'plugin').toLowerCase()
  if (channel !== 'pdf' && printerIndex == null) {
    showFailToast('请先选择打印机')
    await router.push('/printers')
    return
  }
  submitting.value = true
  try {
    rememberShipPrefs(carrierAccountId.value, shipperProfileId.value)
    const snap = buildSnapshot(o)
    const savedExpress = localStorage.getItem(EXPRESS_TYPE_KEY)
    const expressType = savedExpress === '1' || savedExpress === '2' ? savedExpress : '2'
    const useMonthly = !!(carrier?.useMonthly && carrier.custId)
    const shipment = await shippingApi.createShipmentFromOrder({
      carrierAccountId: carrierAccountId.value,
      shipperProfileId: shipperProfileId.value,
      useMonthly,
      expressType,
      cargoName: goodsCargoName(snap.goods),
      parcelQty: 1,
      cargoCount: snap.goods.reduce((n, g) => n + (g.num || 1), 0) || 1,
      totalWeight: 1,
      pickupMode: 'self',
      orderId: o.id,
      sourceSystem: 'ordercore',
      reship: true,
      order: snap,
    })
    const waybill = await shippingApi.createShipmentWaybill(shipment.id)
    await printShipmentByChannel({
      shipmentId: waybill.id,
      printChannel: channel,
      printerIndex,
    })
    showSuccessToast(
      `已重新发货${waybill.mailNo ? ` ${waybill.mailNo}` : ''} · ${getSavedPrinterName() || '打印机'}`,
    )
    await router.replace(`/shipped/${waybill.id}`)
  } catch (e) {
    showFailToast((e as Error).message || '打单失败')
  } finally {
    submitting.value = false
  }
}

async function submit() {
  if (!validateEdit()) {
    step.value = 'edit'
    return
  }
  if (shipMode.value === 'manual') {
    await confirmExpressAppend()
    return
  }
  if (shipMode.value === 'kdzs') {
    if (expressNo.value.trim()) {
      await confirmExpressAppend()
    } else {
      await goKdzsTask()
    }
    return
  }
  if (sfAction.value === 'standard') {
    await goStandard()
    return
  }
  await goQuick()
}

async function load() {
  const id = Number(route.params.id)
  if (!id) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [ctx, cRes, sRes, tpls, devices] = await Promise.all([
      shippingApi.getReshipContext(id),
      shippingApi.listCarrierAccounts({ page: 1, pageSize: 100, enabled: true }),
      shippingApi.listShipperProfiles({ page: 1, pageSize: 100, enabled: true }),
      shippingApi.listExpressTemplates({ page: 1, pageSize: 500 }),
      shippingApi.listKdzsPrintDevices().catch(() => ({ list: [] as KdzsPrintDevice[] })),
    ])
    if (!ctx.shipment?.mailNo || ctx.shipment.status === 'cancelled' || !ctx.order?.id) {
      showFailToast('该发货单不可重新发货')
      loading.value = false
      return
    }
    source.value = ctx.shipment
    order.value = ctx.order
    carriers.value = (cRes.list || []).filter((c) => c.enabled !== false)
    shippers.value = (sRes.list || []).filter((s) => s.enabled !== false)
    kdzsTemplates.value = (tpls.list || []).filter(
      (t) => t.enabled !== false && t.platform === RESHIP_TEMPLATE_GROUP && !!t.templateId,
    )
    kdzsDevices.value = devices.list || []
    const sf =
      carriers.value.find((c) => /sf|顺丰/i.test(`${c.carrierCode || ''}${c.name || ''}`)) ||
      carriers.value[0]
    const shipper = shippers.value.find((s) => s.isDefault) || shippers.value[0]
    carrierAccountId.value = sf?.id
    shipperProfileId.value = shipper?.id
    const savedDev = Number(localStorage.getItem(KDZS_DEVICE_KEY) || 0)
    if (savedDev && kdzsDevices.value.some((d) => d.id === savedDev)) kdzsDeviceId.value = savedDev
    else if (kdzsDevices.value[0]) kdzsDeviceId.value = kdzsDevices.value[0].id
    const savedTpl = localStorage.getItem(KDZS_TEMPLATE_KEY) || ''
    if (savedTpl && kdzsTemplates.value.some((t) => t.templateId === savedTpl)) {
      kdzsTemplateKey.value = savedTpl
    } else if (kdzsTemplates.value[0]?.templateId) {
      kdzsTemplateKey.value = kdzsTemplates.value[0].templateId
    }
    const savedCo =
      findExpressCompany(localStorage.getItem(EXPRESS_COMPANY_CODE_KEY) || '') ||
      findExpressCompany(localStorage.getItem(EXPRESS_COMPANY_KEY) || '')
    if (savedCo) {
      expressCompany.value = savedCo.name
      expressCompanyCode.value = savedCo.code
    }
    prefill(ctx.order, ctx.shipment)
  } catch (e) {
    showFailToast((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ops-notice {
  margin: 10px 12px 0;
  border-radius: 10px;
}
.parse-btn {
  margin: 8px 12px 12px;
  width: calc(100% - 24px);
}
.item-block {
  padding: 8px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.item-block:last-of-type {
  border-bottom: none;
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 100px;
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.5;
}
.mode-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  padding: 10px 12px 4px;
}
.tip {
  padding: 0 12px 10px;
  font-size: 12px;
  line-height: 1.45;
}
.link-inline {
  border: none;
  background: none;
  color: #0f766e;
  padding: 0 2px;
  font-size: inherit;
}
.pick-card .pick-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: none;
  background: transparent;
  text-align: left;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}
.pick-row__badge {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: #fff;
  flex-shrink: 0;
}
.pick-row__badge.ship {
  background: #0f766e;
}
.pick-row__badge.carrier {
  background: #2563eb;
}
.pick-row__body {
  flex: 1;
  min-width: 0;
}
.pick-row__label {
  font-size: 12px;
  color: #64748b;
}
.pick-row__title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.pick-row__arrow {
  color: #94a3b8;
}
.mini-tag {
  margin-left: 6px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-weight: 500;
}
.mini-tag--off {
  background: rgba(148, 163, 184, 0.25);
  color: #64748b;
}
.sheet {
  padding: 16px 16px 24px;
  max-height: 70vh;
  overflow: auto;
}
.sheet-title {
  font-weight: 700;
  margin-bottom: 10px;
}
.option-card {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: #fff;
}
.option-card__title {
  font-weight: 600;
}
.pad {
  padding: 12px;
}
.footer-safe {
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
}
</style>
