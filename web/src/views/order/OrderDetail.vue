<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="订单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.orderNo }}</div>
        <div class="detail-hero__tags">
          <van-tag plain type="primary">{{ labelOrderStatus(detail.status) }}</van-tag>
          <van-tag v-if="detail.shipStatus" plain>{{ labelShipStatus(detail.shipStatus) }}</van-tag>
          <van-tag v-if="detail.allocType" plain type="success">{{ labelAllocType(detail.allocType) }}</van-tag>
        </div>
        <div class="detail-hero__price">¥{{ Number(detail.payAmount ?? detail.totalAmount ?? 0).toFixed(2) }}</div>
      </div>

      <div class="section-label">订单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">类型</span><span class="value">{{ labelSourceChannel(detail.sourceChannel) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || detail.platform || '-' }}</span></div>
        <div class="detail-row" v-if="detail.platformOrderId"><span class="label">平台单号</span><span class="value">{{ detail.platformOrderId }}</span></div>
        <div class="detail-row"><span class="label">买家</span><span class="value">{{ detail.buyerName || detail.buyerNick || '-' }}</span></div>
        <div class="detail-row"><span class="label">手机</span><span class="value">{{ detail.buyerPhone || '-' }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
        <div class="detail-row" v-if="detail.supplierName"><span class="label">供应商</span><span class="value">{{ detail.supplierName }}</span></div>
        <div class="detail-row" v-if="detail.purchaseOrderId"><span class="label">代发单</span><span class="value">{{ detail.purchaseOrderId }}</span></div>
        <div class="detail-row" v-if="detail.selfOrderNo"><span class="label">自营单</span><span class="value">{{ detail.selfOrderNo }}</span></div>
        <div class="detail-row" v-if="detail.ecommerceStatusText || detail.platformStatusText">
          <span class="label">平台状态</span>
          <span class="value">{{ detail.ecommerceStatusText || detail.platformStatusText }}</span>
        </div>
        <div class="detail-row" v-if="detail.shipEntryLocked">
          <span class="label">发货锁定</span>
          <span class="value warn">{{ detail.shipLockReason || '已锁定' }}</span>
        </div>
      </div>

      <div class="section-label">收件信息</div>
      <div class="card">
        <div>{{ addr.name || detail.buyerName || '-' }} · {{ addr.phone || detail.buyerPhone || '-' }}</div>
        <div class="muted addr">
          {{ [addr.province, addr.city, addr.district, addr.address].filter(Boolean).join(' ') || addr.fullText || '-' }}
        </div>
        <div class="addr-actions">
          <van-button size="mini" plain hairline round type="primary" @click="decryptAddr">解密地址</van-button>
          <van-button size="mini" plain hairline round @click="copyAddr">复制</van-button>
        </div>
      </div>

      <div class="section-label">备注</div>
      <div class="card">
        <div class="detail-row" v-if="detail.remark"><span class="label">买家</span><span class="value">{{ detail.remark }}</span></div>
        <div class="detail-row" v-if="detail.sellerRemark"><span class="label">卖家</span><span class="value">{{ detail.sellerRemark }}</span></div>
        <div class="detail-row" v-if="detail.fenFaRemark"><span class="label">分发</span><span class="value">{{ detail.fenFaRemark }}</span></div>
        <div class="detail-row" v-if="detail.printerRemark"><span class="label">打单</span><span class="value">{{ detail.printerRemark }}</span></div>
        <div class="detail-row" v-if="detail.allocRemark"><span class="label">分配</span><span class="value">{{ detail.allocRemark }}</span></div>
        <div class="detail-row" v-if="detail.shipContent"><span class="label">发货内容</span><span class="value">{{ detail.shipContent }}</span></div>
        <div v-if="!hasRemark" class="muted">无备注</div>
      </div>

      <div class="section-label">商品明细</div>
      <div class="card">
        <template v-for="row in itemTree" :key="row.key">
          <div v-if="row.fullGroupHeader" class="split-header">{{ itemTreeTitle(row) }}</div>
          <div v-else class="goods-row" :class="{ 'goods-row--child': row.isSplitChild }">
            <img v-if="row.item.picUrl" :src="row.item.picUrl" alt="" />
            <div v-else class="goods-placeholder">图</div>
            <div class="goods-info">
              <div class="goods-name">
                <span v-if="row.isSplitChild" class="split-prefix">└ </span>
                {{ itemTreeTitle(row) }}
                <span v-if="row.isSplitParent" class="tag-split">已拆分</span>
                <span v-else-if="row.isSplitChild && row.item.splitKind" class="tag-split">
                  {{ splitKindLabel(row.item.splitKind) || '拆分' }}
                </span>
              </div>
              <div class="muted" v-if="itemTreeMeta(row).spec">{{ itemTreeMeta(row).spec }}</div>
              <div class="muted" v-if="itemTreeMeta(row).sku">SKU {{ itemTreeMeta(row).sku }}</div>
              <div class="goods-qty">
                ×{{ row.item.quantity }}
                <span v-if="!row.isSplitChild"> · ¥{{ Number(row.item.price || 0).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </template>
        <div v-if="!itemTree.length" class="muted">无明细行</div>
      </div>

      <div class="section-label">发货记录</div>
      <div class="card" v-if="shipments.length">
        <div v-for="sh in shipments" :key="sh.id" class="ship-block">
          <div class="ship-block__top">
            <strong>{{ sh.expressCompany || '快递' }}</strong>
            <span>{{ sh.expressNo || sh.shipmentNo }}</span>
          </div>
          <div class="muted">
            {{ formatTime(sh.shippedAt) }}
            <template v-if="sh.callbackStatus"> · 回传 {{ sh.callbackStatus }}</template>
          </div>
          <div v-if="sh.callbackMessage" class="muted warn">{{ sh.callbackMessage }}</div>
          <div v-for="(si, idx) in sh.items || []" :key="si.id || idx" class="ship-item muted">
            {{ si.productName || si.skuSpecs || si.skuCode || '商品' }} ×{{ si.qty }}
          </div>
        </div>
      </div>
      <div class="card muted" v-else>暂无发货记录</div>

      <div class="section-label" v-if="splitRows.length">拆分记录</div>
      <div class="card" v-if="splitRows.length">
        <div v-for="row in splitRows" :key="row.key" class="split-rec">
          <div class="goods-name">{{ itemTreeTitle(row) }}</div>
          <div class="muted">
            {{ splitKindLabel(row.item.splitKind) || '拆分' }} · ×{{ row.item.quantity }}
            <template v-if="row.item.parentOrderItemId"> · 父行 #{{ row.item.parentOrderItemId }}</template>
          </div>
        </div>
      </div>

      <div class="section-label" v-if="statusLogs.length">状态流水</div>
      <div class="card" v-if="statusLogs.length">
        <div v-for="(log, i) in statusLogs" :key="log.id || i" class="log-row">
          <div class="log-row__main">
            {{ labelOrderStatus(log.fromStatus) }} → {{ labelOrderStatus(log.toStatus) }}
            <span v-if="log.action" class="muted"> · {{ log.action }}</span>
          </div>
          <div class="muted">{{ formatTime(log.createdAt) }}{{ log.remark ? ` · ${log.remark}` : '' }}</div>
        </div>
      </div>

      <div class="footer-safe" v-if="showFooter">
        <div class="footer-safe__row">
          <van-button v-if="canAllocate" type="primary" round style="flex: 1" @click="openAlloc">分配</van-button>
          <van-button v-if="canRevoke" plain hairline type="warning" round style="flex: 1" @click="onRevoke">撤回</van-button>
          <van-button v-if="canShip" type="primary" plain hairline round style="flex: 1" @click="goShip">打单发货</van-button>
          <van-button v-if="canPush" plain hairline round style="flex: 1" @click="onPush">推送供应商</van-button>
        </div>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>

    <van-action-sheet v-model:show="allocVisible" title="分配履约" :closeable="true">
      <div class="sheet-body">
        <div class="sheet-label">履约方式</div>
        <van-radio-group v-model="allocForm.allocType" direction="horizontal">
          <van-radio name="self_ship">自营发货</van-radio>
          <van-radio name="dropship">供应商代发</van-radio>
        </van-radio-group>
        <template v-if="allocForm.allocType === 'dropship'">
          <div class="sheet-label">供应商</div>
          <van-field v-model="supplierKeyword" placeholder="搜索供应商" clearable @update:model-value="filterSuppliers" />
          <div class="supplier-list">
            <div
              v-for="s in filteredSuppliers"
              :key="s.id"
              class="supplier-item"
              :class="{ 'supplier-item--on': allocForm.supplierId === s.id }"
              @click="pickSupplier(s)"
            >
              {{ s.name }}
            </div>
          </div>
        </template>
        <van-button block type="primary" round :loading="submitting" @click="submitAlloc">确认分配</van-button>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import {
  labelAllocType,
  labelOrderStatus,
  labelShipStatus,
  labelSourceChannel,
  omsApi,
  type OmsOrder,
  type OmsSupplier,
} from '../../api/oms'
import {
  buildItemTreeRows,
  itemTreeMeta,
  itemTreeTitle,
  splitKindLabel,
} from '../../utils/orderItemTree'

const router = useRouter()
const route = useRoute()
const detail = ref<OmsOrder | null>(null)
const allocVisible = ref(false)
const submitting = ref(false)
const suppliers = ref<OmsSupplier[]>([])
const filteredSuppliers = ref<OmsSupplier[]>([])
const supplierKeyword = ref('')
const allocForm = reactive({
  allocType: 'dropship' as 'self_ship' | 'dropship',
  supplierId: 0,
  supplierName: '',
})

const addr = computed(() => detail.value?.address || {})
const itemTree = computed(() => buildItemTreeRows(detail.value?.items))
const splitRows = computed(() => itemTree.value.filter((r) => r.isSplitChild && !r.fullGroupHeader))
const shipments = computed(() => detail.value?.shipments || [])
const statusLogs = computed(() => detail.value?.statusLogs || [])

const hasRemark = computed(() => {
  const o = detail.value
  if (!o) return false
  return !!(o.remark || o.sellerRemark || o.fenFaRemark || o.printerRemark || o.allocRemark || o.shipContent)
})

const canAllocate = computed(() => {
  const o = detail.value
  if (!o) return false
  if (['closed', 'completed'].includes(o.status)) return false
  if (o.shipStatus === 'shipped') return false
  if (o.agentType === 2) return false
  return ['pending_alloc', 'pending_ship', 'allocated', 'purchasing'].includes(o.status)
})

const canRevoke = computed(() => {
  const o = detail.value
  if (!o) return false
  if (!(o.status === 'allocated' || o.status === 'purchasing')) return false
  if (!o.allocType) return false
  if (o.shipStatus === 'shipped') return false
  if (o.sourceChannel === 'kdzs' && o.agentType === 2 && o.dropshipMode === 'kdzs_factory') return false
  return true
})

const canShip = computed(() => {
  const o = detail.value
  if (!o?.allocType) return false
  if (o.shipEntryLocked) return false
  if (o.shipStatus === 'shipped') return false
  if (o.allocType === 'dropship' && o.dropshipMode === 'kdzs_factory') return false
  const s = (o.shipStatus || '').toLowerCase()
  return !s || s === 'wait_ship' || s === 'partial_shipped'
})

const canPush = computed(() => {
  const o = detail.value
  if (!o) return false
  return o.status === 'allocated' || o.status === 'purchasing'
})

const showFooter = computed(() => canAllocate.value || canRevoke.value || canShip.value || canPush.value)

function formatTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

async function load() {
  const id = Number(route.params.id)
  if (!id) {
    showFailToast('无效订单')
    return
  }
  try {
    detail.value = await omsApi.getOrder(id)
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  }
}

async function decryptAddr() {
  if (!detail.value) return
  try {
    const res = await omsApi.decryptOrders([detail.value.id])
    const updated = res.items?.[0]
    if (updated) detail.value = { ...detail.value, ...updated }
    showSuccessToast('已解密')
  } catch (e: any) {
    showFailToast(e.message || '解密失败')
  }
}

async function copyAddr() {
  const a = addr.value
  const text = [
    a.name || detail.value?.buyerName || '',
    a.phone || detail.value?.buyerPhone || '',
    [a.province, a.city, a.district, a.address].filter(Boolean).join(' ') || a.fullText || '',
  ]
    .filter(Boolean)
    .join(' ')
  try {
    await navigator.clipboard.writeText(text)
    showSuccessToast('已复制')
  } catch {
    showFailToast('复制失败')
  }
}

async function openAlloc() {
  allocForm.allocType = 'dropship'
  allocForm.supplierId = 0
  allocForm.supplierName = ''
  supplierKeyword.value = ''
  try {
    const res = await omsApi.listSuppliers({ page: 1, pageSize: 200 })
    suppliers.value = res.list || []
    filteredSuppliers.value = suppliers.value
    allocVisible.value = true
  } catch (e: any) {
    showFailToast(e.message || '加载供应商失败')
  }
}

function filterSuppliers() {
  const q = supplierKeyword.value.trim().toLowerCase()
  filteredSuppliers.value = !q
    ? suppliers.value
    : suppliers.value.filter((s) => s.name.toLowerCase().includes(q))
}

function pickSupplier(s: OmsSupplier) {
  allocForm.supplierId = s.id
  allocForm.supplierName = s.name
}

async function submitAlloc() {
  if (!detail.value) return
  if (allocForm.allocType === 'dropship' && !allocForm.supplierId) {
    showFailToast('请选择供应商')
    return
  }
  submitting.value = true
  try {
    detail.value = await omsApi.allocateOrder(detail.value.id, {
      allocType: allocForm.allocType,
      supplierId: allocForm.allocType === 'dropship' ? allocForm.supplierId : undefined,
      supplierName: allocForm.allocType === 'dropship' ? allocForm.supplierName : undefined,
    })
    showSuccessToast(
      detail.value.purchaseOrderId ? `分配成功 · ${detail.value.purchaseOrderId}` : '分配成功',
    )
    allocVisible.value = false
  } catch (e: any) {
    showFailToast(e.message || '分配失败')
  } finally {
    submitting.value = false
  }
}

async function onRevoke() {
  if (!detail.value) return
  try {
    await showConfirmDialog({
      title: '撤回分配',
      message: '确认撤回？将同步快递助手撤单，订单恢复为待分配。',
    })
  } catch {
    return
  }
  try {
    detail.value = await omsApi.revokeAllocate(detail.value.id)
    showSuccessToast('已撤回分配')
  } catch (e: any) {
    showFailToast(e.message || '撤回失败')
  }
}

function goShip() {
  if (!detail.value) return
  router.push({
    path: `/ship/${detail.value.id}`,
    query: detail.value.orderNo ? { no: detail.value.orderNo } : undefined,
  })
}

async function onPush() {
  if (!detail.value) return
  try {
    detail.value = await omsApi.pushOrder(detail.value.id)
    showSuccessToast('已推送')
  } catch (e: any) {
    showFailToast(e.message || '推送失败')
  }
}

onMounted(load)
</script>

<style scoped>
.detail-hero__no {
  font-family: var(--ops-display);
  font-size: 18px;
  font-weight: 700;
}
.detail-hero__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}
.detail-hero__price {
  font-size: 20px;
  font-weight: 700;
  color: var(--ops-ink);
}
.addr {
  margin-top: 6px;
  line-height: 1.45;
}
.addr-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.warn {
  color: #c2410c;
}
.goods-row--child {
  padding-left: 8px;
  opacity: 0.95;
}
.goods-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: #eef2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ops-muted);
  font-size: 12px;
  flex-shrink: 0;
}
.split-prefix {
  color: var(--ops-muted);
}
.tag-split {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 650;
  color: #b45309;
  background: #fffbeb;
  border-radius: 6px;
  padding: 1px 6px;
}
.goods-qty {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
}
.split-header {
  font-size: 13px;
  font-weight: 650;
  color: var(--ops-ink-soft);
  padding: 8px 0 4px;
}
.split-rec {
  padding: 8px 0;
  border-bottom: 1px solid var(--ops-line);
}
.split-rec:last-child {
  border-bottom: none;
}
.ship-block {
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.ship-block:last-child {
  border-bottom: none;
}
.ship-block__top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
}
.ship-item {
  margin-top: 4px;
  font-size: 12px;
}
.log-row {
  padding: 8px 0;
  border-bottom: 1px solid var(--ops-line);
}
.log-row:last-child {
  border-bottom: none;
}
.log-row__main {
  font-size: 13px;
  font-weight: 600;
}
.page-loading {
  padding-top: 48px;
}
.sheet-body {
  padding: 8px 16px 24px;
}
.sheet-label {
  font-size: 13px;
  font-weight: 650;
  margin: 12px 0 8px;
  color: var(--ops-ink-soft);
}
.supplier-list {
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.supplier-item {
  padding: 12px 10px;
  border-bottom: 1px solid var(--ops-line);
  font-size: 14px;
}
.supplier-item--on {
  color: var(--ops-primary);
  font-weight: 650;
  background: var(--ops-primary-soft);
}
.footer-safe__row {
  display: flex;
  gap: 8px;
}
</style>
