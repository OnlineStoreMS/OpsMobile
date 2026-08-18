<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="自营订单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.refTraceId || detail.soNo }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag">{{ labelSelfDocStatus(detail.status) }}</span>
          <span
            v-if="labelSelfShipStatus(detail.status)"
            class="ops-tag"
            :class="shipTagClass(detail.status)"
          >{{ labelSelfShipStatus(detail.status) }}</span>
          <span class="ops-tag" :class="payTagClass(detail.payStatus)">{{ labelSelfPayStatus(detail.payStatus) }}</span>
        </div>
        <div class="detail-hero__price">¥{{ Number(detail.saleAmount || 0).toFixed(2) }}</div>
      </div>

      <div class="section-label">订单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">收件人</span><span class="value">{{ detail.buyerName }} {{ detail.buyerPhone }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ detail.address || '-' }}</span></div>
        <div class="detail-row"><span class="label">备注</span><span class="value">{{ detail.remark || '-' }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
        <div class="detail-row"><span class="label">发货</span><span class="value">{{ formatTime(detail.shippedAt) }}</span></div>
      </div>

      <div class="section-label">商品</div>
      <div class="card">
        <div
          v-for="row in goodsTreeRows"
          :key="row.key"
          class="goods-row"
          :class="{ 'goods-row--child': row.isSplitChild, 'goods-row--header': row.fullGroupHeader }"
        >
          <img v-if="!row.fullGroupHeader && row.item.picUrl" :src="row.item.picUrl" alt="" />
          <div v-else class="goods-pic-placeholder">{{ row.isSplitChild ? '└' : '' }}</div>
          <div class="goods-info">
            <div class="goods-name">
              <span v-if="row.isSplitChild" class="tree-prefix">└ </span>
              {{ selfGoodsTitle(row) }}
              <span v-if="row.isSplitParent" class="split-badge">已拆分</span>
              <span v-else-if="row.isSplitChild" class="split-badge split-badge--child">拆分</span>
            </div>
            <div v-if="selfGoodsMeta(row)" class="muted">{{ selfGoodsMeta(row) }}</div>
            <div v-if="!row.fullGroupHeader" class="goods-logistics">
              <template v-if="logisticsByItem.get(row.item.id)?.length">
                <div v-for="(t, i) in logisticsByItem.get(row.item.id)" :key="i" class="goods-logistics__line">
                  {{ t }}
                </div>
              </template>
              <span v-else-if="row.isSplitParent" class="muted goods-logistics__empty">见拆分行</span>
              <span v-else class="muted goods-logistics__empty">未发货</span>
            </div>
          </div>
        </div>
        <div v-if="!goodsTreeRows.length" class="muted">无商品行</div>
      </div>

      <template v-if="showPaymentSection">
        <div class="section-label">
          付款记录
          <span class="section-label__extra">
            已付 ¥{{ paidSum.toFixed(2) }} · 待付 ¥{{ remainAmount.toFixed(2) }}
          </span>
        </div>
        <div class="card" v-if="paymentsLoading">
          <van-loading size="20px">加载付款…</van-loading>
        </div>
        <div v-else-if="payments.length" class="pay-list">
          <div v-for="p in payments" :key="p.id" class="card pay-card">
            <div class="pay-card__hd">
              <strong>¥{{ Number(p.payAmount || 0).toFixed(2) }}</strong>
              <span class="muted">{{ payMethodLabel(p.payMethod) }}</span>
            </div>
            <div class="muted pay-card__meta">
              {{ formatTime(p.paidAt || p.createdAt) }}
              <template v-if="p.remark"> · {{ p.remark }}</template>
            </div>
            <div v-if="screenshotsByPayment.get(p.id)?.length" class="pay-shots">
              <button
                v-for="a in screenshotsByPayment.get(p.id)"
                :key="a.id"
                type="button"
                class="pay-shot"
                @click="previewShots(p.id, a.fileUrl)"
              >
                <img :src="a.fileUrl" alt="付款截图" />
              </button>
            </div>
          </div>
        </div>
        <div class="card" v-else>
          <div class="muted empty-ship">暂无付款记录</div>
        </div>
      </template>

      <div class="section-label">
        发货物流
        <span class="section-label__extra" v-if="shipments.length">{{ shipments.length }} 批</span>
      </div>
      <div class="card" v-if="shipmentsLoading">
        <van-loading size="20px">加载物流…</van-loading>
      </div>
      <div v-else-if="shipments.length" class="ship-list">
        <div v-for="sh in shipments" :key="sh.id" class="card ship-card">
          <div class="ship-card__hd">
            <div class="ship-card__no">{{ sh.shipmentNo || `#${sh.id}` }}</div>
            <span class="ops-tag" :class="shipmentStatusClass(sh.status)">
              {{ SELF_SHIPMENT_STATUS_MAP[sh.status] || sh.status || '-' }}
            </span>
          </div>
          <div class="ship-card__track">
            <strong>{{ sh.carrierName || sh.carrierCode || '快递' }}</strong>
            <span class="ship-card__mail">{{ sh.trackingNo || '暂无单号' }}</span>
          </div>
          <div class="ship-card__meta muted">
            <span>回传 {{ sh.callbackOk ? '成功' : '待回传' }}</span>
            <span>·</span>
            <span>扣库 {{ sh.stockDeducted ? '已扣' : '未扣' }}</span>
            <span v-if="sh.shippedAt">· {{ formatTime(sh.shippedAt) }}</span>
          </div>
          <div class="ship-card__goods">
            <div class="ship-card__goods-label">对应商品</div>
            <div v-if="shipmentGoodsLines(sh).length">
              <div v-for="(line, idx) in shipmentGoodsLines(sh)" :key="idx" class="ship-goods-line">
                {{ line }}
              </div>
            </div>
            <div v-else class="muted">未关联商品明细</div>
          </div>
          <div v-if="sh.receiverName || sh.receiverPhone" class="ship-card__recv muted">
            收件 {{ sh.receiverName || '' }} {{ sh.receiverPhone || '' }}
          </div>
        </div>
      </div>
      <div class="card" v-else>
        <div class="muted empty-ship">暂无发货物流记录</div>
      </div>

      <div class="footer-safe" v-if="canRecordPay || canShip">
        <van-button v-if="canRecordPay" type="primary" block round plain hairline @click="openPaySheet">
          记录付款
        </van-button>
        <van-button v-if="canShip" type="primary" block round @click="goShip">打单发货</van-button>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />

    <van-popup
      v-model:show="showPaySheet"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
      :close-on-click-overlay="!savingPay"
    >
      <div class="sheet pay-sheet">
        <div class="sheet-title">记录付款</div>
        <div class="muted pay-hint">
          销售 ¥{{ Number(detail?.saleAmount || 0).toFixed(2) }} · 待付 ¥{{ remainAmount.toFixed(2) }}；
          累计付清后自动标记已付清
        </div>
        <van-field
          v-model="payForm.payAmountText"
          type="number"
          label="付款金额"
          required
          placeholder="0.00"
          input-align="right"
        />
        <van-field label="付款方式" required>
          <template #input>
            <div class="pay-method-row">
              <button
                v-for="m in payMethods"
                :key="m.value"
                type="button"
                class="pay-method-chip"
                :class="{ active: payForm.payMethod === m.value }"
                @click="payForm.payMethod = m.value"
              >
                {{ m.label }}
              </button>
            </div>
          </template>
        </van-field>
        <div class="pay-upload-block">
          <div class="pay-upload-label">付款截图</div>
          <van-uploader
            v-model="shotFiles"
            multiple
            :max-count="6"
            :max-size="8 * 1024 * 1024"
            accept="image/*"
            :after-read="onShotAfterRead"
            @oversize="() => showFailToast('单张图片不能超过 8MB')"
          />
          <div class="muted pay-upload-tip">可拍照或从相册选择，建议上传转账截图</div>
        </div>
        <van-field v-model="payForm.payAccount" label="打款账号" placeholder="可选" />
        <van-field v-model="payForm.payeeAccount" label="收款账号" placeholder="可选" />
        <van-field v-model="payForm.payeeName" label="收款户名" placeholder="可选" />
        <van-field v-model="payForm.remark" label="备注" placeholder="可选" rows="2" autosize type="textarea" />
        <div class="pay-sheet-actions">
          <van-button block round :disabled="savingPay" @click="showPaySheet = false">取消</van-button>
          <van-button type="primary" block round :loading="savingPay" @click="submitPay">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  showFailToast,
  showLoadingToast,
  showSuccessToast,
  showImagePreview,
  closeToast,
  type UploaderFileListItem,
} from 'vant'
import {
  createSelfAttachment,
  createSelfPayment,
  getSelfOrder,
  listSelfAttachments,
  listSelfPayments,
  listSelfShipments,
  SELF_PAY_METHOD_MAP,
  SELF_SHIPMENT_STATUS_MAP,
  uploadSelfImage,
  type SelfAttachment,
  type SelfOrderDetail,
  type SelfPayment,
  type SelfShipment,
} from '../api/selfOrder'
import {
  formatOrderSource,
  formatTime,
  labelSelfDocStatus,
  labelSelfShipStatus,
  labelSelfPayStatus,
  deriveSelfShipStatus,
} from '../utils/labels'
import { buildSelfGoodsTreeRows, selfGoodsMeta, selfGoodsTitle } from '../utils/selfGoodsTree'

const route = useRoute()
const router = useRouter()
const detail = ref<SelfOrderDetail | null>(null)
const shipments = ref<SelfShipment[]>([])
const payments = ref<SelfPayment[]>([])
const attachments = ref<SelfAttachment[]>([])
const loading = ref(true)
const shipmentsLoading = ref(false)
const paymentsLoading = ref(false)
const showPaySheet = ref(false)
const savingPay = ref(false)
const shotFiles = ref<UploaderFileListItem[]>([])

const payMethods = [
  { value: 'bank', label: '银行转账' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'other', label: '其他' },
]

const payForm = reactive({
  payAmountText: '',
  payMethod: 'bank',
  payAccount: '',
  payeeAccount: '',
  payeeName: '',
  remark: '',
})

const itemById = computed(() => {
  const map = new Map<number, NonNullable<SelfOrderDetail['items']>[number]>()
  for (const it of detail.value?.items || []) {
    if (it.id) map.set(it.id, it)
  }
  return map
})

const goodsTreeRows = computed(() => buildSelfGoodsTreeRows(detail.value?.items))

const logisticsByItem = computed(() => {
  const map = new Map<number, string[]>()
  for (const sh of shipments.value) {
    const tracking = [sh.carrierName || sh.carrierCode, sh.trackingNo].filter(Boolean).join(' ')
    if (!tracking) continue
    for (const it of sh.items || []) {
      if (!it.selfOrderItemId) continue
      const arr = map.get(it.selfOrderItemId) || []
      if (!arr.includes(tracking)) arr.push(tracking)
      map.set(it.selfOrderItemId, arr)
    }
  }
  return map
})

const paidSum = computed(() =>
  payments.value.filter((p) => p.payStatus === 'paid').reduce((s, p) => s + Number(p.payAmount || 0), 0),
)

const remainAmount = computed(() => Math.max(0, Number(detail.value?.saleAmount || 0) - paidSum.value))

const screenshotsByPayment = computed(() => {
  const map = new Map<number, SelfAttachment[]>()
  for (const a of attachments.value) {
    if (a.fileType !== 'payment_screenshot' || !a.paymentId) continue
    const arr = map.get(a.paymentId) || []
    arr.push(a)
    map.set(a.paymentId, arr)
  }
  return map
})

/** 电商单默认视为平台收款，不展示手工记录付款 */
const showPaymentSection = computed(() => {
  if (!detail.value) return false
  if ((detail.value.sourceChannel || '').toLowerCase() === 'kdzs') return false
  if (detail.value.status === 'draft') return false
  return true
})

const canRecordPay = computed(() => {
  if (!showPaymentSection.value || !detail.value) return false
  if (detail.value.status === 'cancelled') return false
  const pay = (detail.value.payStatus || 'unpaid').trim()
  return pay === 'unpaid' || pay === 'partial'
})

const canShip = computed(() => {
  if (!detail.value?.refSoId) return false
  const ship = deriveSelfShipStatus(detail.value.status)
  return ship === 'wait_ship' || ship === 'partial_shipped'
})

function shipmentGoodsLines(sh: SelfShipment): string[] {
  const items = sh.items || []
  if (!items.length) return []
  return items.map((it) => {
    const orderItem = itemById.value.get(it.selfOrderItemId)
    const spec = (orderItem?.skuSpecs || orderItem?.productName || orderItem?.skuCode || `明细#${it.selfOrderItemId}`).trim()
    const qty = it.qty > 0 ? it.qty : 1
    return `${spec} ×${qty}`
  })
}

function shipmentStatusClass(status?: string) {
  const s = (status || '').trim()
  if (s === 'delivered' || s === 'shipped') return 'ops-tag--ok'
  if (s === 'in_transit' || s === 'pending') return 'ops-tag--warn'
  if (s === 'exception') return 'ops-tag--warn'
  return ''
}

function shipTagClass(status?: string) {
  const ship = deriveSelfShipStatus(status)
  if (ship === 'shipped') return 'ops-tag--ok'
  if (ship === 'partial_shipped' || ship === 'wait_ship') return 'ops-tag--warn'
  return ''
}

function payTagClass(pay?: string) {
  const s = (pay || 'unpaid').trim()
  if (s === 'paid') return 'ops-tag--ok'
  if (s === 'partial') return 'ops-tag--warn'
  return ''
}

function payMethodLabel(method?: string) {
  return SELF_PAY_METHOD_MAP[method || ''] || method || '—'
}

function goShip() {
  if (!detail.value?.refSoId) return
  router.push({
    path: `/ship/${detail.value.refSoId}`,
    query: detail.value.refTraceId ? { no: detail.value.refTraceId } : undefined,
  })
}

function openPaySheet() {
  payForm.payAmountText = String(remainAmount.value || Number(detail.value?.saleAmount || 0) || '')
  payForm.payMethod = 'bank'
  payForm.payAccount = ''
  payForm.payeeAccount = ''
  payForm.payeeName = ''
  payForm.remark = ''
  shotFiles.value = []
  showPaySheet.value = true
}

function previewShots(paymentId: number, current: string) {
  const urls = (screenshotsByPayment.value.get(paymentId) || []).map((a) => a.fileUrl).filter(Boolean)
  if (!urls.length) return
  const start = Math.max(0, urls.indexOf(current))
  showImagePreview({ images: urls, startPosition: start })
}

async function onShotAfterRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const list = Array.isArray(item) ? item : [item]
  for (const fileItem of list) {
    const raw = fileItem.file
    if (!raw) continue
    fileItem.status = 'uploading'
    fileItem.message = '上传中…'
    try {
      const uploaded = await uploadSelfImage(raw, 'self/payments')
      fileItem.url = uploaded.url
      fileItem.status = 'done'
      fileItem.message = ''
    } catch (e: any) {
      fileItem.status = 'failed'
      fileItem.message = e?.message || '上传失败'
      showFailToast(e?.message || '截图上传失败')
    }
  }
}

function fileNameFromUrl(url: string) {
  try {
    const path = url.split('?')[0]
    const name = path.split('/').pop() || ''
    return decodeURIComponent(name) || '付款截图.jpg'
  } catch {
    return '付款截图.jpg'
  }
}

async function submitPay() {
  if (!detail.value?.id || savingPay.value) return
  const amount = Number(payForm.payAmountText)
  if (!(amount > 0)) {
    showFailToast('请输入付款金额')
    return
  }
  const pendingUrls = shotFiles.value
    .filter((f) => f.status === 'done' && f.url)
    .map((f) => String(f.url))
  const uploading = shotFiles.value.some((f) => f.status === 'uploading')
  if (uploading) {
    showFailToast('截图还在上传，请稍候')
    return
  }
  const failed = shotFiles.value.some((f) => f.status === 'failed')
  if (failed) {
    showFailToast('有截图上传失败，请删除后重试')
    return
  }

  savingPay.value = true
  try {
    const payment = await createSelfPayment(detail.value.id, {
      payAmount: amount,
      payMethod: payForm.payMethod,
      payAccount: payForm.payAccount.trim(),
      payeeAccount: payForm.payeeAccount.trim(),
      payeeName: payForm.payeeName.trim(),
      remark: payForm.remark.trim(),
      payStatus: 'paid',
    })
    for (const url of pendingUrls) {
      await createSelfAttachment(detail.value.id, {
        fileType: 'payment_screenshot',
        fileName: fileNameFromUrl(url),
        fileUrl: url,
        paymentId: payment.id,
        remark: '付款截图',
      })
    }
    const nextPaid = paidSum.value + amount
    const total = Number(detail.value.saleAmount || 0)
    if (total > 0 && nextPaid + 0.001 >= total) {
      showSuccessToast('已记录，订单已标记付清')
    } else if (total > 0) {
      showSuccessToast(`已记录（已付 ¥${nextPaid.toFixed(2)}）`)
    } else {
      showSuccessToast('已记录付款')
    }
    showPaySheet.value = false
    detail.value = await getSelfOrder(detail.value.id)
    await loadPayments(detail.value.id)
  } catch (e: any) {
    showFailToast(e?.message || '保存失败')
  } finally {
    savingPay.value = false
  }
}

async function loadShipments(selfOrderId: number) {
  shipmentsLoading.value = true
  try {
    shipments.value = await listSelfShipments(selfOrderId)
  } catch (e: any) {
    shipments.value = []
    showFailToast(e.message || '加载物流失败')
  } finally {
    shipmentsLoading.value = false
  }
}

async function loadPayments(selfOrderId: number) {
  if (!showPaymentSection.value && detail.value) {
    // still allow load if channel known after detail set
  }
  paymentsLoading.value = true
  try {
    const [pays, files] = await Promise.all([
      listSelfPayments(selfOrderId),
      listSelfAttachments(selfOrderId),
    ])
    payments.value = pays
    attachments.value = files
  } catch (e: any) {
    payments.value = []
    attachments.value = []
    showFailToast(e.message || '加载付款失败')
  } finally {
    paymentsLoading.value = false
  }
}

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    detail.value = await getSelfOrder(id)
    if (detail.value?.id) {
      const tasks: Promise<void>[] = [loadShipments(detail.value.id)]
      if ((detail.value.sourceChannel || '').toLowerCase() !== 'kdzs' && detail.value.status !== 'draft') {
        tasks.push(loadPayments(detail.value.id))
      }
      await Promise.all(tasks)
    }
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
    closeToast()
    if (route.query.pay === '1' && canRecordPay.value) {
      openPaySheet()
    }
  }
})
</script>

<style scoped>
.detail-hero {
  background: linear-gradient(155deg, #0b1f2a, #163447 60%, #0f766e);
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
  flex-wrap: wrap;
}
.detail-hero__tags .ops-tag {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.detail-hero__price {
  margin-top: 16px;
  font-family: var(--ops-display);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.section-label__extra {
  font-size: 12px;
  font-weight: 500;
  color: var(--ops-muted);
}
.goods-row {
  display: flex;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--ops-line);
}
.goods-row:last-child {
  border-bottom: none;
}
.goods-row img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.goods-info {
  flex: 1;
  min-width: 0;
}
.goods-name {
  font-weight: 600;
  font-size: 14px;
}
.goods-row--child {
  padding-left: 8px;
}
.goods-row--header .goods-name {
  color: var(--ops-muted);
  font-weight: 500;
}
.goods-pic-placeholder {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ops-muted);
  font-size: 16px;
}
.tree-prefix {
  color: var(--ops-muted);
  font-weight: 500;
}
.split-badge {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 500;
  color: #b45309;
  background: #fff7ed;
  border-radius: 4px;
  padding: 1px 5px;
}
.split-badge--child {
  color: #475569;
  background: #f1f5f9;
}
.goods-logistics {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
}
.goods-logistics__line {
  color: var(--ops-primary);
  font-weight: 550;
}
.goods-logistics__empty {
  font-size: 12px;
}
.ship-list,
.pay-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pay-card__hd {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.pay-card__hd strong {
  font-family: var(--ops-display);
  font-size: 18px;
  color: var(--ops-danger);
}
.pay-card__meta {
  margin-top: 6px;
  font-size: 12px;
}
.pay-shots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.pay-shot {
  border: 0;
  padding: 0;
  background: transparent;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
}
.pay-shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.ship-card__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.ship-card__no {
  font-weight: 700;
  font-size: 14px;
}
.ship-card__track {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.ship-card__mail {
  font-family: var(--ops-display);
  font-weight: 650;
  letter-spacing: -0.02em;
}
.ship-card__meta {
  font-size: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ship-card__goods {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ops-line);
}
.ship-card__goods-label {
  font-size: 12px;
  color: var(--ops-muted);
  margin-bottom: 4px;
}
.ship-goods-line {
  font-size: 13px;
  line-height: 1.45;
}
.ship-card__recv {
  margin-top: 8px;
  font-size: 12px;
}
.empty-ship {
  padding: 8px 0;
  text-align: center;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, rgba(232, 238, 242, 0), rgba(232, 238, 242, 0.92) 28%, #e8eef2 100%);
}
.pay-sheet {
  max-height: min(88vh, 720px);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
.pay-hint {
  padding: 0 4px 10px;
  font-size: 12px;
  line-height: 1.4;
}
.pay-method-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
}
.pay-method-chip {
  border: 1px solid var(--ops-line);
  background: #fff;
  color: var(--ops-text);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
}
.pay-method-chip.active {
  border-color: var(--ops-primary);
  background: var(--ops-primary-soft);
  color: var(--ops-primary);
  font-weight: 650;
}
.pay-upload-block {
  padding: 8px 16px 12px;
}
.pay-upload-label {
  font-size: 14px;
  color: var(--ops-text);
  margin-bottom: 8px;
}
.pay-upload-tip {
  margin-top: 6px;
  font-size: 12px;
}
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 4px 4px;
}
</style>
