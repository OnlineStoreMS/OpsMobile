<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.poNo }}</div>
        <div class="detail-hero__tags">
          <van-tag plain type="primary">{{ labelPoStatus(detail.status) }}</van-tag>
          <van-tag plain>{{ labelPayStatus(detail.payStatus) }}</van-tag>
          <van-tag plain type="success">{{ labelFulfillmentType(detail.fulfillmentType) }}</van-tag>
        </div>
        <div class="detail-hero__price">采购 ¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</div>
        <div class="muted" v-if="detail.saleAmount">销售 ¥{{ Number(detail.saleAmount).toFixed(2) }}</div>
      </div>

      <div class="section-label">基本信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">供应商</span><span class="value">{{ detail.supplierName || '-' }}</span></div>
        <div class="detail-row"><span class="label">采购时间</span><span class="value">{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
        <div class="detail-row" v-if="detail.refTraceId || detail.refSoId">
          <span class="label">关联销售单</span>
          <span class="value">{{ detail.refTraceId || `#${detail.refSoId}` }}</span>
        </div>
        <div class="detail-row" v-if="detail.remark"><span class="label">备注</span><span class="value">{{ detail.remark }}</span></div>
        <div v-if="isDropship" class="addr-actions">
          <van-button size="mini" plain hairline round type="warning" :loading="decrypting" @click="handleDecrypt">解密</van-button>
          <van-button size="mini" plain hairline round :loading="copying" @click="handleCopy">复制</van-button>
          <van-button size="mini" plain hairline round type="primary" :loading="syncing" @click="syncLogistics">同步物流</van-button>
        </div>
      </div>

      <div class="section-label" v-if="linkedSales.length">关联销售单</div>
      <div class="card" v-if="linkedSales.length">
        <div v-for="so in linkedSales" :key="so.orderNo" class="so-row">
          <div>
            <strong>{{ so.orderNo }}</strong>
            <span v-if="so.cancelled" class="tag-cancel">已撤回</span>
          </div>
          <van-button
            v-if="!so.cancelled && canDetach"
            size="mini"
            plain
            hairline
            type="warning"
            @click="detachSo(so.orderNo)"
          >
            解绑
          </van-button>
        </div>
      </div>

      <div class="section-label">采购明细</div>
      <div class="card">
        <template v-for="row in itemTree" :key="row.key">
          <div class="goods-row" :class="{ 'goods-row--child': row.isSplitChild, 'goods-row--cancelled': row.item.cancelled }">
            <img v-if="row.item.picUrl" :src="row.item.picUrl" alt="" />
            <div v-else class="goods-placeholder">图</div>
            <div class="goods-info">
              <div class="goods-name">
                <span v-if="row.isSplitChild" class="split-prefix">└ </span>
                {{ poItemTitle(row) }}
                <span v-if="row.isSplitParent" class="tag-split">已拆分</span>
                <span v-else-if="row.isSplitChild" class="tag-split">{{ splitKindLabel(row.item.splitKind) || '拆分' }}</span>
                <span v-if="row.item.cancelled" class="tag-cancel">已撤回</span>
              </div>
              <div class="muted" v-if="poItemMeta(row).spec">{{ poItemMeta(row).spec }}</div>
              <div class="muted" v-if="row.item.refOrderNo && !row.isSplitChild">销售单 {{ row.item.refOrderNo }}</div>
              <div class="goods-qty">
                ×{{ row.item.qty }}
                <template v-if="!row.isSplitChild">
                  · 采购 ¥{{ Number(row.item.unitPrice || 0).toFixed(2) }}
                  <template v-if="row.item.saleAmount"> · 实付 ¥{{ Number(row.item.saleAmount).toFixed(2) }}</template>
                </template>
              </div>
              <div class="item-actions" v-if="isDropship && !row.item.cancelled">
                <van-button
                  v-if="canEditSplit(row)"
                  size="mini"
                  plain
                  hairline
                  round
                  type="primary"
                  @click="openSplit(row)"
                >
                  {{ row.isSplitParent ? '编辑拆分' : '拆分' }}
                </van-button>
                <van-button
                  v-if="canShipLine(row)"
                  size="mini"
                  type="primary"
                  round
                  @click="openShip(row)"
                >
                  发货并回传
                </van-button>
              </div>
            </div>
          </div>
        </template>
        <div v-if="!itemTree.length" class="muted">无明细</div>
      </div>

      <div class="section-label">发货记录</div>
      <div class="card" v-if="shipments.length">
        <div v-for="sh in shipments" :key="sh.id" class="ship-block">
          <div class="ship-block__top">
            <strong>{{ sh.carrierName || '快递' }}</strong>
            <span>{{ sh.trackingNo || sh.shipmentNo }}</span>
          </div>
          <div class="muted">
            {{ labelShipmentStatus(sh.status) }}
            <template v-if="sh.shippedAt"> · {{ formatTime(sh.shippedAt) }}</template>
          </div>
          <div v-if="sh.receiverName || sh.receiverAddress" class="muted">
            {{ sh.receiverName }} {{ sh.receiverPhone }} {{ sh.receiverAddress }}
          </div>
        </div>
      </div>
      <div class="card muted" v-else>暂无发货记录</div>

      <div class="footer-safe" v-if="showFooter">
        <div class="footer-safe__row">
          <van-button v-if="canSubmit" type="primary" round style="flex: 1" :loading="acting" @click="doSubmit">提交下单</van-button>
          <van-button v-if="canComplete" type="primary" plain round style="flex: 1" :loading="acting" @click="doComplete">完成</van-button>
          <van-button v-if="canCancel" type="warning" plain hairline round style="flex: 1" :loading="acting" @click="doCancel">取消</van-button>
          <van-button v-if="canDelete" type="danger" plain hairline round style="flex: 1" :loading="acting" @click="doDelete">删除</van-button>
        </div>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>

    <!-- 拆分 -->
    <van-popup v-model:show="splitVisible" position="bottom" round :style="{ maxHeight: '80%' }">
      <div class="sheet-body">
        <div class="sheet-title">{{ splitEditMode ? '编辑拆分' : '拆分规格' }}</div>
        <div class="muted" style="margin-bottom: 8px">留空保存即取消拆分</div>
        <div v-for="(line, idx) in splitLines" :key="idx" class="split-line">
          <van-field v-model="line.skuName" label="规格" placeholder="规格名称（默认留空）" />
          <van-field v-model.number="line.qty" type="digit" label="数量" />
          <van-button size="mini" plain type="danger" @click="splitLines.splice(idx, 1)">删除</van-button>
        </div>
        <van-button block plain hairline type="primary" style="margin: 8px 0" @click="splitLines.push({ skuName: '', qty: 1 })">
          + 添加规格
        </van-button>
        <van-button block type="primary" round :loading="splitSaving" @click="saveSplit">保存</van-button>
      </div>
    </van-popup>

    <!-- 发货并回传 -->
    <van-popup v-model:show="shipVisible" position="bottom" round :style="{ maxHeight: '80%' }">
      <div class="sheet-body">
        <div class="sheet-title">发货并回传</div>
        <div class="muted" v-if="shipTarget">{{ shipTargetTitle }}</div>
        <van-field v-model="shipForm.expressCompany" is-link readonly label="快递公司" placeholder="选择" @click="showExpressPicker = true" />
        <van-field v-model="shipForm.expressNo" label="运单号" placeholder="物流单号" />
        <van-button block type="primary" round :loading="shipSaving" style="margin-top: 12px" @click="submitShip">
          发货并回传
        </van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showExpressPicker" position="bottom" round>
      <van-picker
        :columns="expressColumns"
        @confirm="onExpressConfirm"
        @cancel="showExpressPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import {
  labelFulfillmentType,
  labelPayStatus,
  labelPoStatus,
  labelShipmentStatus,
  supplyApi,
  type PoShipment,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from '../../api/supply'
import { EXPRESS_COMPANIES } from '../../constants/expressCompanies'
import {
  buildPoItemTree,
  isShippablePoItem,
  poItemMeta,
  poItemTitle,
  splitKindLabel,
  type PoItemTreeRow,
} from '../../utils/poItemTree'
import {
  buildMultiOrderCopyText,
  canDecryptOrder,
  isMaskedReceiver,
} from '../../utils/supplyOrderCopy'

const router = useRouter()
const route = useRoute()
const detail = ref<PurchaseOrder | null>(null)
const shipments = ref<PoShipment[]>([])
const decrypting = ref(false)
const copying = ref(false)
const syncing = ref(false)
const acting = ref(false)

const splitVisible = ref(false)
const splitEditMode = ref(false)
const splitSaving = ref(false)
const splitParent = ref<PurchaseOrderItem | null>(null)
const splitLines = ref<{ skuName: string; qty: number; shipPlanLineId?: number }[]>([])

const shipVisible = ref(false)
const shipSaving = ref(false)
const shipTarget = ref<PurchaseOrderItem | null>(null)
const shipForm = reactive({ expressCompany: '', expressNo: '' })
const showExpressPicker = ref(false)
const expressColumns = EXPRESS_COMPANIES.map((c) => ({ text: c.name, value: c.name }))

const isDropship = computed(() => detail.value?.fulfillmentType === 'dropship')
const navTitle = computed(() => (isDropship.value ? '代发单详情' : '采购单详情'))
const itemTree = computed(() => buildPoItemTree(detail.value?.items))

const linkedSales = computed(() => {
  const po = detail.value
  if (!po) return [] as { orderNo: string; cancelled: boolean }[]
  const map = new Map<string, { orderNo: string; cancelled: boolean }>()
  for (const it of po.items || []) {
    const no = (it.refOrderNo || '').trim()
    if (!no) continue
    const prev = map.get(no)
    if (!prev) map.set(no, { orderNo: no, cancelled: !!it.cancelled })
    else if (!it.cancelled) prev.cancelled = false
  }
  if (!map.size && po.refTraceId) {
    for (const no of po.refTraceId.split(',').map((s) => s.trim()).filter(Boolean)) {
      map.set(no, { orderNo: no, cancelled: false })
    }
  }
  return [...map.values()]
})

const canDetach = computed(() => {
  const s = detail.value?.status
  return !!s && s !== 'cancelled' && s !== 'completed'
})

const canSubmit = computed(() => detail.value?.status === 'draft')
const canComplete = computed(() => {
  const s = detail.value?.status
  return s === 'shipped' || s === 'partial_received' || s === 'ordered' || s === 'awaiting_ship' || s === 'partial_shipped'
})
const canCancel = computed(() => {
  const s = detail.value?.status
  return s === 'draft' || s === 'ordered' || s === 'awaiting_ship'
})
const canDelete = computed(() => detail.value?.status === 'draft')
const showFooter = computed(() => canSubmit.value || canComplete.value || canCancel.value || canDelete.value)

const shipTargetTitle = computed(() => {
  const it = shipTarget.value
  if (!it) return ''
  return (it.skuSpecs || it.productName || '').trim()
})

function formatTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

function canEditSplit(row: PoItemTreeRow) {
  if (!isDropship.value) return false
  if (row.isSplitChild) return false
  if (row.item.cancelled) return false
  const s = detail.value?.status
  return s !== 'cancelled' && s !== 'completed'
}

function canShipLine(row: PoItemTreeRow) {
  if (!isDropship.value || !detail.value) return false
  if (row.item.cancelled) return false
  if (!isShippablePoItem(row.item, detail.value.items || [])) return false
  const s = detail.value.status
  return s !== 'draft' && s !== 'cancelled'
}

async function loadAll() {
  const id = Number(route.params.id)
  if (!id) return
  detail.value = await supplyApi.getPurchaseOrder(id)
  try {
    shipments.value = await supplyApi.listShipments(id)
  } catch {
    shipments.value = []
  }
}

async function collectLinkedOrders() {
  if (!detail.value) throw new Error('未加载')
  const ids = new Set<number>()
  if (detail.value.refSoId && detail.value.refSoId > 0) ids.add(detail.value.refSoId)
  for (const it of detail.value.items || []) {
    if (it.refSoId && it.refSoId > 0) ids.add(it.refSoId)
  }
  if (!ids.size) throw new Error('未关联销售订单')
  const orders = []
  for (const id of ids) orders.push(await supplyApi.fetchOrder(id))
  return orders
}

async function handleDecrypt() {
  decrypting.value = true
  try {
    const orders = await collectLinkedOrders()
    const ecommerce = orders.filter((o) => canDecryptOrder(o))
    if (!ecommerce.length) {
      showFailToast('无可解密的电商订单')
      return
    }
    const data = await supplyApi.decryptOrders(ecommerce.map((o) => o.id))
    showSuccessToast(data.success > 1 ? `已解密 ${data.success} 笔` : '解密成功')
  } catch (e: any) {
    showFailToast(e.message || '解密失败')
  } finally {
    decrypting.value = false
  }
}

async function handleCopy() {
  copying.value = true
  try {
    let orders = await collectLinkedOrders()
    const need = orders.filter((o) => canDecryptOrder(o) && isMaskedReceiver(o))
    if (need.length) {
      const data = await supplyApi.decryptOrders(need.map((o) => o.id))
      const byId = new Map((data.items || []).map((o) => [o.id, o]))
      orders = orders.map((o) => byId.get(o.id) || o)
    }
    const text = buildMultiOrderCopyText(orders)
    if (!text.trim()) {
      showFailToast('暂无收件信息')
      return
    }
    await navigator.clipboard.writeText(text)
    showSuccessToast(orders.length > 1 ? `已复制 ${orders.length} 笔` : '已复制')
  } catch (e: any) {
    showFailToast(e.message || '复制失败')
  } finally {
    copying.value = false
  }
}

async function syncLogistics() {
  if (!detail.value) return
  syncing.value = true
  try {
    const res = await supplyApi.syncShipmentsFromOrders(detail.value.id)
    showSuccessToast(`同步 新建${res.created} 更新${res.updated}`)
    await loadAll()
  } catch (e: any) {
    showFailToast(e.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function detachSo(orderNo: string) {
  if (!detail.value) return
  try {
    await showConfirmDialog({ title: '解绑销售单', message: `从本代发单解绑 ${orderNo}？` })
  } catch {
    return
  }
  try {
    detail.value = await supplyApi.detachSalesOrder({
      poNo: detail.value.poNo,
      orderNo,
      reason: '手机端解绑',
    })
    showSuccessToast('已解绑')
  } catch (e: any) {
    showFailToast(e.message || '解绑失败')
  }
}

function openSplit(row: PoItemTreeRow) {
  splitParent.value = row.item
  const kids = (detail.value?.items || []).filter(
    (x) => x.parentPoItemId === row.item.id && x.splitKind === 'partial' && !x.cancelled,
  )
  splitEditMode.value = kids.length > 0
  splitLines.value = kids.length
    ? kids.map((k) => ({
        skuName: k.skuSpecs || k.productName || '',
        qty: k.qty || 1,
        shipPlanLineId: k.shipPlanLineId || undefined,
      }))
    : []
  splitVisible.value = true
}

async function saveSplit() {
  if (!detail.value || !splitParent.value?.id) return
  const lines = splitLines.value
    .map((l) => ({
      skuName: (l.skuName || '').trim(),
      qty: Number(l.qty) || 0,
      shipPlanLineId: l.shipPlanLineId,
    }))
    .filter((l) => l.qty > 0)
  if (!lines.length && splitEditMode.value) {
    try {
      await showConfirmDialog({ title: '取消拆分', message: '清空规格将取消拆分，确认？' })
    } catch {
      return
    }
  }
  splitSaving.value = true
  try {
    const res = await supplyApi.splitItem(detail.value.id, splitParent.value.id, lines)
    if (res.syncWarning) showFailToast(res.syncWarning)
    else showSuccessToast(lines.length ? '拆分已保存' : '已取消拆分')
    splitVisible.value = false
    await loadAll()
  } catch (e: any) {
    showFailToast(e.message || '拆分失败')
  } finally {
    splitSaving.value = false
  }
}

function openShip(row: PoItemTreeRow) {
  shipTarget.value = row.item
  shipForm.expressCompany = ''
  shipForm.expressNo = ''
  shipVisible.value = true
}

function onExpressConfirm({ selectedOptions }: { selectedOptions: Array<{ text: string }> }) {
  shipForm.expressCompany = selectedOptions[0]?.text || ''
  showExpressPicker.value = false
}

async function submitShip() {
  if (!detail.value || !shipTarget.value) return
  if (!shipForm.expressCompany.trim()) {
    showFailToast('请选择快递公司')
    return
  }
  if (!shipForm.expressNo.trim()) {
    showFailToast('请填写运单号')
    return
  }
  const soId = shipTarget.value.refSoId || detail.value.refSoId
  if (!soId) {
    showFailToast('缺少销售单关联')
    return
  }
  shipSaving.value = true
  try {
    await supplyApi.createShipment(detail.value.id, {
      carrierName: shipForm.expressCompany,
      trackingNo: shipForm.expressNo,
      status: 'shipped',
      items: [{ poItemId: shipTarget.value.id, qty: shipTarget.value.qty }],
    })
    await supplyApi.shipOrder(soId, {
      expressCompany: shipForm.expressCompany,
      expressNo: shipForm.expressNo,
      callback: true,
      items: shipTarget.value.refOrderItemId
        ? [{ orderItemId: shipTarget.value.refOrderItemId, qty: shipTarget.value.qty }]
        : undefined,
    })
    await supplyApi.syncShipmentsFromOrders(detail.value.id, soId)
    showSuccessToast('已发货并回传')
    shipVisible.value = false
    await loadAll()
  } catch (e: any) {
    showFailToast(e.message || '发货失败')
  } finally {
    shipSaving.value = false
  }
}

async function doSubmit() {
  if (!detail.value) return
  acting.value = true
  try {
    detail.value = await supplyApi.submitPO(detail.value.id)
    showSuccessToast('已提交')
  } catch (e: any) {
    showFailToast(e.message || '提交失败')
  } finally {
    acting.value = false
  }
}

async function doComplete() {
  if (!detail.value) return
  try {
    await showConfirmDialog({ title: '完成采购单', message: '确认标记为已完成？' })
  } catch {
    return
  }
  acting.value = true
  try {
    detail.value = await supplyApi.completePO(detail.value.id)
    showSuccessToast('已完成')
  } catch (e: any) {
    showFailToast(e.message || '操作失败')
  } finally {
    acting.value = false
  }
}

async function doCancel() {
  if (!detail.value) return
  try {
    await showConfirmDialog({ title: '取消采购单', message: '确认取消？' })
  } catch {
    return
  }
  acting.value = true
  try {
    detail.value = await supplyApi.cancelPO(detail.value.id)
    showSuccessToast('已取消')
  } catch (e: any) {
    showFailToast(e.message || '取消失败')
  } finally {
    acting.value = false
  }
}

async function doDelete() {
  if (!detail.value) return
  try {
    await showConfirmDialog({ title: '删除', message: '删除后不可恢复，确认？' })
  } catch {
    return
  }
  acting.value = true
  try {
    await supplyApi.deletePO(detail.value.id)
    showSuccessToast('已删除')
    router.back()
  } catch (e: any) {
    showFailToast(e.message || '删除失败')
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  try {
    await loadAll()
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  }
})
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
  font-size: 18px;
  font-weight: 700;
}
.addr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.so-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--ops-line);
}
.so-row:last-child {
  border-bottom: none;
}
.goods-row--child {
  padding-left: 6px;
}
.goods-row--cancelled {
  opacity: 0.55;
  text-decoration: line-through;
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
.tag-cancel {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  color: #b91c1c;
  background: #fef2f2;
  border-radius: 6px;
  padding: 1px 6px;
}
.goods-qty {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
}
.item-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
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
.footer-safe__row {
  display: flex;
  gap: 8px;
}
.page-loading {
  padding-top: 48px;
}
.sheet-body {
  padding: 16px 16px 28px;
}
.sheet-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
}
.split-line {
  border: 1px solid var(--ops-line);
  border-radius: 12px;
  padding: 4px 8px 8px;
  margin-bottom: 8px;
}
</style>
