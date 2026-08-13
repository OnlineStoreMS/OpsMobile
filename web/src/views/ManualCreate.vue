<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="新建手工单" left-arrow @click-left="router.back()" />

    <template v-if="!created">
      <div class="page-body">
        <van-notice-bar
          class="ops-notice"
          left-icon="info-o"
          background="rgba(15, 118, 110, 0.1)"
          color="#0f766e"
          text="提交后自动分配自营，不同步快递助手；请用「打单发货」自建物流发货。"
        />

        <div class="section-label" style="margin-top: 14px">智能填单</div>
        <div class="card">
          <van-field
            v-model="rawAddress"
            rows="3"
            autosize
            type="textarea"
            label="粘贴地址"
            placeholder="姓名 手机 省市区详细地址"
          />
          <van-button block type="primary" plain class="parse-btn" :loading="parsing" @click="onParse">
            智能识别
          </van-button>
        </div>

        <div class="section-label">收件信息</div>
        <div class="card">
          <van-button
            block
            plain
            type="primary"
            icon="friends-o"
            class="pick-recipient-btn"
            @click="openRecipientPicker"
          >
            从客户中心选择
          </van-button>
          <van-field v-model="form.buyerName" label="收件人" required placeholder="姓名" />
          <van-field v-model="form.buyerPhone" label="手机" required placeholder="手机号" />
          <van-field v-model="form.buyerTel" label="固话" placeholder="可选" />
          <van-field v-model="form.province" label="省" required placeholder="省" />
          <van-field v-model="form.city" label="市" required placeholder="市" />
          <van-field v-model="form.district" label="区" required placeholder="区/县" />
          <van-field
            v-model="form.detail"
            rows="2"
            autosize
            type="textarea"
            label="详细地址"
            required
            placeholder="街道门牌"
          />
          <van-cell title="保存到客户中心" center>
            <template #right-icon>
              <van-switch v-model="saveCustomer" size="20px" />
            </template>
          </van-cell>
          <div class="muted" style="padding: 0 12px 8px">
            开启后将收件人写入客户中心，下次可搜索选用
          </div>
        </div>

        <div class="section-label">商品</div>
        <div class="card">
          <div class="section-head">
            <span>明细行</span>
            <van-button size="small" type="primary" plain icon="plus" @click="addLine">加一行</van-button>
          </div>
          <div v-for="(it, idx) in items" :key="idx" class="item-block">
            <van-field
              v-model="it.productName"
              label="规格"
              required
              placeholder="商品名称 / 规格"
            />
            <div class="item-row">
              <van-field
                v-model.number="it.quantity"
                type="digit"
                label="数量"
                required
                input-align="right"
              />
              <van-field
                v-model="it.priceText"
                type="number"
                label="单价"
                required
                input-align="right"
                placeholder="0"
              />
            </div>
            <div class="item-footer">
              <span class="muted">小计 ¥{{ lineTotal(it).toFixed(2) }}</span>
              <van-button
                v-if="items.length > 1"
                size="mini"
                type="danger"
                plain
                @click="items.splice(idx, 1)"
              >
                删除
              </van-button>
            </div>
          </div>
          <div class="total-row">
            <span>订单合计</span>
            <strong>¥{{ orderTotal.toFixed(2) }}</strong>
          </div>
        </div>

        <div class="section-label">其它</div>
        <div class="card">
          <van-field
            v-model="sourceLabel"
            is-link
            readonly
            label="订单来源"
            :placeholder="sourcesLoading ? '加载中…' : '请选择或新建'"
            @click="openSourcePicker"
          />
          <van-field
            v-model="form.remark"
            rows="2"
            autosize
            type="textarea"
            label="备注"
            placeholder="可选"
          />
        </div>
      </div>

      <div class="action-bar">
        <van-button type="primary" block round :loading="submitting" @click="submit">提交订单</van-button>
      </div>
    </template>

    <div v-else class="page-body">
      <div class="card success-box">
        <van-icon name="checked" color="#16a34a" size="48" />
        <div style="margin-top: 8px; font-weight: 600">建单成功</div>
        <div class="order-no">{{ created.orderNo }}</div>
        <div class="muted">{{ created.tip }}</div>
        <div class="muted" style="margin-top: 12px">可在本机「待发货 → 打单发货」用自建物流发货</div>
        <van-button type="primary" block style="margin-top: 20px" @click="goShipCreated">去打单发货</van-button>
        <van-button block plain style="margin-top: 8px" @click="resetForm">再建一单</van-button>
        <van-button block plain style="margin-top: 8px" @click="router.replace('/')">返回首页</van-button>
      </div>
    </div>

    <van-action-sheet
      v-model:show="showSourcePicker"
      :actions="sourceActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onSourceSelect"
    />

    <!-- 底部面板：避免居中 Dialog 在软键盘弹出时上下跳动 -->
    <van-popup
      v-model:show="showCreateSource"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
      :close-on-click-overlay="!creatingSource"
      @opened="onCreateSourceOpened"
      @closed="onCreateSourceClosed"
    >
      <div class="sheet create-source-sheet">
        <div class="sheet-title">新建订单来源</div>
        <van-field
          ref="createSourceFieldRef"
          v-model="newSourceName"
          maxlength="64"
          clearable
          placeholder="名称，如：微信私域 / 线下门店"
          enterkeyhint="done"
          @keyup.enter="confirmCreateSource"
        />
        <div class="create-source-actions">
          <van-button block round :disabled="creatingSource" @click="showCreateSource = false">取消</van-button>
          <van-button type="primary" block round :loading="creatingSource" @click="confirmCreateSource">
            确定
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup
      v-model:show="showRecipientPicker"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
      :style="{ height: '88%' }"
      @opened="onRecipientPopupOpened"
    >
      <div class="recipient-panel">
        <div class="recipient-header">
          <button type="button" class="recipient-close" @click="showRecipientPicker = false">关闭</button>
          <div class="recipient-title">选择收件人</div>
          <span class="recipient-close placeholder" />
        </div>
        <van-search
          ref="recipientSearchRef"
          v-model="recipientKeyword"
          shape="round"
          clearable
          placeholder="输入姓名、手机或地址，自动搜索"
          @update:model-value="onRecipientKeywordChange"
          @search="runRecipientSearch"
          @clear="runRecipientSearch"
        />
        <div class="recipient-hint muted">点选即可填入收件信息</div>
        <div class="recipient-list">
          <van-list
            v-model:loading="recipientLoadingMore"
            :finished="recipientFinished"
            :finished-text="recipientList.length ? '没有更多了' : ''"
            @load="loadMoreRecipients"
          >
            <div
              v-for="row in recipientList"
              :key="`${row.customerId}-${row.addressId}`"
              class="recipient-item"
              @click="applyRecipient(row)"
            >
              <div class="recipient-avatar">{{ recipientInitial(row) }}</div>
              <div class="recipient-body">
                <div class="recipient-name">
                  <span>{{ row.contactName || row.displayName || '未命名' }}</span>
                  <span class="recipient-phone">{{ row.phone || row.primaryPhone || '' }}</span>
                </div>
                <div class="recipient-addr">{{ formatRecipientAddress(row) || '暂无地址' }}</div>
              </div>
              <van-icon name="arrow" class="recipient-arrow" />
            </div>
          </van-list>
          <div v-if="recipientSearching && !recipientList.length" class="recipient-state">
            <van-loading size="24px">搜索中…</van-loading>
          </div>
          <van-empty
            v-else-if="!recipientSearching && !recipientList.length"
            image="search"
            description="未找到收件人，换个关键词试试"
          />
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import {
  createManualOrder,
  createManualOrderSource,
  listManualOrderSources,
  parseManualAddress,
  searchManualRecipients,
  type ManualOrderSource,
  type RecipientSearchItem,
} from '../api/manualOrder'

interface LineItem {
  productName: string
  quantity: number
  priceText: string
}

const router = useRouter()
const rawAddress = ref('')
const parsing = ref(false)
const submitting = ref(false)
const showSourcePicker = ref(false)
const showCreateSource = ref(false)
const creatingSource = ref(false)
const newSourceName = ref('')
const sources = ref<ManualOrderSource[]>([])
const sourcesLoading = ref(false)
const manualSourceId = ref<number | undefined>()
const sourceLabel = ref('')
const saveCustomer = ref(true)

const showRecipientPicker = ref(false)
const recipientKeyword = ref('')
const recipientSearching = ref(false)
const recipientLoadingMore = ref(false)
const recipientFinished = ref(true)
const recipientBootstrapped = ref(false)
const recipientList = ref<RecipientSearchItem[]>([])
const recipientTotal = ref(0)
const recipientPage = ref(1)
const recipientSearchRef = ref<{ focus?: () => void } | null>(null)
let recipientSearchTimer: ReturnType<typeof setTimeout> | null = null
let recipientReqSeq = 0

const CREATE_SOURCE_ID = -1

const form = reactive({
  buyerName: '',
  buyerPhone: '',
  buyerTel: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  remark: '',
})

const items = ref<LineItem[]>([emptyLine()])
const created = ref<{ orderNo: string; orderId?: number; tip: string } | null>(null)

const sourceActions = computed(() => [
  { name: '＋ 新建来源', id: CREATE_SOURCE_ID, color: '#1a73e8' },
  ...sources.value.map((s) => ({ name: s.name, id: s.id })),
])

const orderTotal = computed(() =>
  items.value.reduce((sum, it) => sum + lineTotal(it), 0),
)

function emptyLine(): LineItem {
  return { productName: '', quantity: 1, priceText: '' }
}

function lineTotal(it: LineItem) {
  const qty = Number(it.quantity) || 0
  const price = Number(it.priceText) || 0
  return Math.round(qty * price * 100) / 100
}

function addLine() {
  items.value.push(emptyLine())
}

function onSourceSelect(action: { name: string; id: number }) {
  if (action.id === CREATE_SOURCE_ID) {
    newSourceName.value = ''
    // 等 ActionSheet 关闭动画结束再开面板，避免两层遮罩抢位置
    window.setTimeout(() => {
      showCreateSource.value = true
    }, 280)
    return
  }
  manualSourceId.value = action.id
  sourceLabel.value = action.name
}

const createSourceFieldRef = ref<{ focus?: () => void } | null>(null)

function onCreateSourceOpened() {
  nextTick(() => {
    // 面板定位完成后再聚焦，减少键盘顶起时的跳动
    window.setTimeout(() => {
      createSourceFieldRef.value?.focus?.()
    }, 50)
  })
}

function onCreateSourceClosed() {
  if (!creatingSource.value) newSourceName.value = ''
}

async function confirmCreateSource() {
  if (creatingSource.value) return
  const name = newSourceName.value.trim()
  if (!name) {
    showFailToast('请输入来源名称')
    return
  }
  creatingSource.value = true
  try {
    const row = await createManualOrderSource({ name, enabled: true })
    sources.value = [
      { id: row.id, name: row.name, code: row.code, enabled: row.enabled },
      ...sources.value.filter((s) => s.id !== row.id),
    ]
    manualSourceId.value = row.id
    sourceLabel.value = row.name
    newSourceName.value = ''
    showCreateSource.value = false
    showSuccessToast('已新建并选中')
  } catch (e: any) {
    showFailToast(e?.message || '新建失败')
  } finally {
    creatingSource.value = false
  }
}

async function openSourcePicker() {
  if (!sourcesLoading.value) {
    await loadSources()
  }
  showSourcePicker.value = true
}

async function loadSources() {
  sourcesLoading.value = true
  try {
    const list = await listManualOrderSources()
    sources.value = Array.isArray(list) ? list : []
  } catch (e: any) {
    sources.value = []
    showFailToast(e?.message || '加载订单来源失败')
  } finally {
    sourcesLoading.value = false
  }
}

async function onParse() {
  if (!rawAddress.value.trim()) {
    showFailToast('请先粘贴地址')
    return
  }
  parsing.value = true
  try {
    const parsed = await parseManualAddress(rawAddress.value.trim())
    form.buyerName = parsed.name || form.buyerName
    form.buyerPhone = parsed.phone || form.buyerPhone
    form.buyerTel = parsed.tel || form.buyerTel
    form.province = parsed.address?.province || form.province
    form.city = parsed.address?.city || form.city
    form.district = parsed.address?.district || form.district
    form.detail = parsed.address?.detail || form.detail
    showSuccessToast('已识别')
  } catch (e: any) {
    showFailToast(e.message || '识别失败')
  } finally {
    parsing.value = false
  }
}

function formatRecipientAddress(row: RecipientSearchItem) {
  return `${row.province || ''}${row.city || ''}${row.district || ''}${row.detail || ''}`
}

function recipientInitial(row: RecipientSearchItem) {
  const name = (row.contactName || row.displayName || '客').trim()
  return name.slice(0, 1)
}

function openRecipientPicker() {
  showRecipientPicker.value = true
  recipientKeyword.value = form.buyerPhone || form.buyerName || ''
  recipientBootstrapped.value = false
  recipientFinished.value = true
  recipientPage.value = 1
  void runRecipientSearch()
}

function onRecipientPopupOpened() {
  nextTick(() => {
    const el = document.querySelector('.recipient-panel .van-field__control') as HTMLInputElement | null
    el?.focus?.()
  })
}

function onRecipientKeywordChange() {
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer)
  recipientSearchTimer = setTimeout(() => {
    runRecipientSearch()
  }, 320)
}

async function runRecipientSearch() {
  recipientPage.value = 1
  recipientBootstrapped.value = false
  recipientFinished.value = true
  await searchRecipients(true)
  recipientBootstrapped.value = true
}

async function searchRecipients(reset: boolean) {
  const seq = ++recipientReqSeq
  if (reset) {
    recipientSearching.value = true
  } else {
    recipientLoadingMore.value = true
  }
  try {
    const data = await searchManualRecipients(recipientKeyword.value.trim(), recipientPage.value, 20)
    if (seq !== recipientReqSeq) return
    const list = data?.list || []
    if (reset || recipientPage.value <= 1) {
      recipientList.value = list
    } else {
      recipientList.value = [...recipientList.value, ...list]
    }
    recipientTotal.value = data?.total || 0
    recipientFinished.value =
      recipientList.value.length >= recipientTotal.value || list.length < 20
  } catch (e: any) {
    if (seq !== recipientReqSeq) return
    recipientFinished.value = true
    showFailToast(e.message || '搜索失败')
  } finally {
    if (seq === recipientReqSeq) {
      recipientSearching.value = false
      recipientLoadingMore.value = false
    }
  }
}

async function loadMoreRecipients() {
  if (!recipientBootstrapped.value || recipientFinished.value || recipientSearching.value) {
    recipientLoadingMore.value = false
    return
  }
  recipientPage.value += 1
  await searchRecipients(false)
}

function applyRecipient(row: RecipientSearchItem) {
  form.buyerName = row.contactName || row.displayName || ''
  form.buyerPhone = row.phone || row.primaryPhone || ''
  form.province = row.province || ''
  form.city = row.city || ''
  form.district = row.district || ''
  form.detail = row.detail || ''
  showRecipientPicker.value = false
  showSuccessToast('已填入收件人')
}

async function submit() {
  if (!form.buyerName || (!form.buyerPhone && !form.buyerTel)) {
    showFailToast('请填写收件人与手机/固话')
    return
  }
  if (!form.province || !form.city || !form.district || !form.detail) {
    showFailToast('请填写完整省市区与详细地址')
    return
  }
  const payloadItems = items.value
    .map((it) => ({
      productName: it.productName.trim(),
      skuSpecs: it.productName.trim(),
      quantity: Number(it.quantity) || 0,
      price: Number(it.priceText) || 0,
    }))
    .filter((it) => it.productName)
  if (!payloadItems.length) {
    showFailToast('请至少填写一行商品规格')
    return
  }
  for (const it of payloadItems) {
    if (it.quantity <= 0) {
      showFailToast('数量须大于 0')
      return
    }
  }

  submitting.value = true
  showLoadingToast({ message: '提交中…', forbidClick: true, duration: 0 })
  try {
    const order = await createManualOrder({
      buyerName: form.buyerName,
      buyerPhone: form.buyerPhone,
      buyerTel: form.buyerTel,
      remark: form.remark,
      saveCustomer: saveCustomer.value,
      // 手机端默认只走自建物流：本地建单并分配自营，不同步快递助手
      syncKdzs: false,
      createAction: 'create_and_push',
      printMode: 'carrier',
      manualSourceId: manualSourceId.value || undefined,
      totalAmount: orderTotal.value,
      payAmount: orderTotal.value,
      address: {
        name: form.buyerName,
        phone: form.buyerPhone,
        province: form.province,
        city: form.city,
        district: form.district,
        address: form.detail,
      },
      items: payloadItems,
    })
    closeToast()
    created.value = {
      orderNo: order.orderNo,
      orderId: order.id,
      tip: '已创建并分配自营（未同步快递助手）',
    }
  } catch (e: any) {
    closeToast()
    showFailToast(e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  created.value = null
  items.value = [emptyLine()]
  rawAddress.value = ''
  form.buyerName = ''
  form.buyerPhone = ''
  form.buyerTel = ''
  form.province = ''
  form.city = ''
  form.district = ''
  form.detail = ''
  form.remark = ''
  manualSourceId.value = undefined
  sourceLabel.value = ''
  saveCustomer.value = true
}

function goShipCreated() {
  const c = created.value
  if (!c?.orderId) {
    router.replace('/pending')
    return
  }
  router.replace({
    path: `/ship/${c.orderId}`,
    query: c.orderNo ? { no: c.orderNo } : undefined,
  })
}

onMounted(loadSources)

onUnmounted(() => {
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer)
})
</script>

<style scoped>
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 650;
  margin-bottom: 8px;
  color: var(--ops-ink-soft);
}
.parse-btn {
  margin-top: 8px;
  height: 40px;
  border-radius: 12px;
}
.pick-recipient-btn {
  margin: 0 0 10px;
  height: 42px;
  border-radius: 12px;
  border-style: dashed;
}
.item-block {
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.item-block:last-of-type {
  border-bottom: none;
}
.item-row {
  display: flex;
  gap: 4px;
}
.item-row :deep(.van-field) {
  flex: 1;
}
.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 8px;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px 4px;
  font-size: 15px;
  border-top: 1px solid var(--ops-line);
  margin-top: 4px;
}
.total-row strong {
  color: var(--ops-danger);
  font-family: var(--ops-display);
  font-size: 20px;
  letter-spacing: -0.02em;
}
.recipient-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ops-bg);
}
.recipient-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 4px;
  background: rgba(255, 255, 255, 0.92);
}
.recipient-title {
  font-family: var(--ops-display);
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.recipient-close {
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-size: 14px;
  font-weight: 600;
  padding: 6px 8px;
  min-width: 48px;
}
.recipient-close.placeholder {
  visibility: hidden;
}
.recipient-hint {
  padding: 0 16px 8px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 12px;
}
.recipient-list {
  flex: 1;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px 16px;
}
.recipient-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  margin-bottom: 8px;
  background: var(--ops-card-solid);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: var(--ops-shadow-sm);
  transition: background 0.15s ease, transform 0.1s ease;
}
.recipient-item:active {
  background: #e8f6f3;
  transform: scale(0.985);
}
.recipient-avatar {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ops-display);
  font-weight: 700;
  flex-shrink: 0;
}
.recipient-body {
  flex: 1;
  min-width: 0;
}
.recipient-name {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 15px;
  font-weight: 650;
  margin-bottom: 4px;
}
.recipient-phone {
  color: var(--ops-muted);
  font-size: 13px;
  font-weight: 400;
}
.recipient-addr {
  color: var(--ops-muted);
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.recipient-arrow {
  color: #c8c9cc;
  flex-shrink: 0;
}
.recipient-state {
  padding: 40px 0;
  text-align: center;
}
.create-source-sheet {
  max-height: none;
}
.create-source-sheet :deep(.van-field) {
  margin: 4px 0 16px;
  background: #f4f7f9;
  border-radius: 12px;
  padding: 4px 8px;
}
.create-source-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-bottom: 4px;
}
</style>
