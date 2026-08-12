<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待发货详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.orderNo }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag">{{ labelOmsStatus(detail.status) }}</span>
          <span class="ops-tag ops-tag--warn">{{ labelShipStatus(detail.shipStatus) }}</span>
        </div>
        <div class="detail-hero__price" v-if="detail.totalAmount != null || detail.payAmount != null">
          ¥{{ Number(detail.payAmount ?? detail.totalAmount ?? 0).toFixed(2) }}
        </div>
      </div>

      <div class="section-label">收件人信息</div>
      <div class="card">
        <div class="detail-row">
          <span class="label">姓名</span>
          <span class="value">{{ detail.buyerName || detail.address?.name || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">电话</span>
          <span class="value">{{ detail.buyerPhone || detail.address?.phone || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">省市区</span>
          <span class="value">{{ regionText }}</span>
        </div>
        <div class="detail-row">
          <span class="label">详细地址</span>
          <span class="value">{{ detail.address?.address || detail.address?.fullText || '-' }}</span>
        </div>
      </div>

      <div class="section-label">订单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">自营单</span><span class="value">{{ detail.selfOrderNo || '-' }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.payTime) }}</span></div>
        <div class="detail-row"><span class="label">备注</span><span class="value">{{ detail.remark || detail.sellerRemark || '-' }}</span></div>
        <div class="detail-row" v-if="detail.shipContent">
          <span class="label">发货内容</span>
          <span class="value">{{ detail.shipContent }}</span>
        </div>
      </div>

      <div class="section-label">商品明细</div>
      <div class="card">
        <div v-for="(it, idx) in detail.items || []" :key="idx" class="goods-row">
          <img v-if="it.picUrl" :src="it.picUrl" alt="" />
          <div class="goods-info">
            <div class="goods-name">{{ it.skuSpecs || it.productName || '商品' }}</div>
            <div class="muted">
              ×{{ it.quantity || 1 }}
              <template v-if="it.price != null"> · ¥{{ Number(it.price).toFixed(2) }}</template>
              <template v-if="it.totalAmount != null"> · 小计 ¥{{ Number(it.totalAmount).toFixed(2) }}</template>
            </div>
          </div>
        </div>
        <div v-if="!detail.items?.length" class="muted">无商品行</div>
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
import { getOmsOrder, listPendingOmsOrders, type OMSOrder } from '../api/shipping'
import { formatOrderSource, formatTime, labelOmsStatus, labelShipStatus } from '../utils/labels'

const route = useRoute()
const router = useRouter()
const detail = ref<OMSOrder | null>(null)
const loading = ref(true)

const regionText = computed(() => {
  const a = detail.value?.address
  if (!a) return '-'
  const t = [a.province, a.city, a.district].filter(Boolean).join(' ')
  return t || '-'
})

const canShip = computed(() => {
  const s = (detail.value?.shipStatus || '').toLowerCase()
  return !s || s === 'wait_ship' || s === 'partial_shipped' || s.includes('wait')
})

function goShip() {
  if (!detail.value) return
  router.push({
    path: `/ship/${detail.value.id}`,
    query: detail.value.orderNo ? { no: detail.value.orderNo } : undefined,
  })
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return null
  try {
    return await getOmsOrder(id)
  } catch {
    // 兜底：按订单号从待发货列表找
    const no = typeof route.query.no === 'string' ? route.query.no : ''
    const keyword = no || String(id)
    const res = await listPendingOmsOrders({ keyword, shipStatus: 'wait_ship', page: 1, pageSize: 50 })
    return (res.list || []).find((o) => o.id === id) || (res.list || []).find((o) => o.orderNo === no) || null
  }
}

onMounted(async () => {
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    detail.value = await loadDetail()
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
  background: linear-gradient(155deg, #0b1f2a, #163447 55%, #c2410c);
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
.detail-hero__tags .ops-tag,
.detail-hero__tags .ops-tag--warn {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.detail-hero__price {
  margin-top: 14px;
  font-family: var(--ops-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 30%);
}
</style>
