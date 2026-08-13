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
        <div v-for="it in detail.items || []" :key="it.id" class="goods-row">
          <img v-if="it.picUrl" :src="it.picUrl" alt="" />
          <div class="goods-info">
            <div class="goods-name">{{ it.productName }}</div>
            <div class="muted">{{ it.skuSpecs || it.skuCode }} · ×{{ it.qty }} · ¥{{ Number(it.saleAmount || 0).toFixed(2) }}</div>
            <div class="goods-logistics">
              <template v-if="logisticsByItem.get(it.id)?.length">
                <div v-for="(t, i) in logisticsByItem.get(it.id)" :key="i" class="goods-logistics__line">
                  {{ t }}
                </div>
              </template>
              <span v-else class="muted goods-logistics__empty">未发货</span>
            </div>
          </div>
        </div>
        <div v-if="!detail.items?.length" class="muted">无商品行</div>
      </div>

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

      <div class="footer-safe" v-if="canShip">
        <van-button type="primary" block round @click="goShip">打单发货</van-button>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import {
  getSelfOrder,
  listSelfShipments,
  SELF_SHIPMENT_STATUS_MAP,
  type SelfOrderDetail,
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

const route = useRoute()
const router = useRouter()
const detail = ref<SelfOrderDetail | null>(null)
const shipments = ref<SelfShipment[]>([])
const loading = ref(true)
const shipmentsLoading = ref(false)

const itemById = computed(() => {
  const map = new Map<number, NonNullable<SelfOrderDetail['items']>[number]>()
  for (const it of detail.value?.items || []) {
    if (it.id) map.set(it.id, it)
  }
  return map
})

/** 商品行 → 物流文案（快递名 + 单号），与电脑端一致 */
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

const canShip = computed(() => {
  if (!detail.value?.refSoId) return false
  const ship = deriveSelfShipStatus(detail.value.status)
  return ship === 'wait_ship' || ship === 'partial_shipped'
})

function goShip() {
  if (!detail.value?.refSoId) return
  router.push({
    path: `/ship/${detail.value.refSoId}`,
    query: detail.value.refTraceId ? { no: detail.value.refTraceId } : undefined,
  })
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

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    detail.value = await getSelfOrder(id)
    if (detail.value?.id) {
      await loadShipments(detail.value.id)
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
.ship-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-size: 15px;
}
.ship-card__mail {
  font-family: var(--ops-display);
  font-weight: 650;
  letter-spacing: 0.02em;
  word-break: break-all;
}
.ship-card__meta {
  margin-top: 6px;
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
  font-weight: 550;
  line-height: 1.45;
  padding: 2px 0;
}
.ship-card__recv {
  margin-top: 8px;
  font-size: 12px;
}
.empty-ship {
  padding: 8px 0;
  font-size: 13px;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 30%);
}
</style>
