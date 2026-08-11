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
        <div class="detail-hero__sub">
          {{ detail.buyerName || detail.address?.name || '-' }}
          {{ detail.buyerPhone || detail.address?.phone || '' }}
        </div>
      </div>

      <div class="section-label">订单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ addrText }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.payTime) }}</span></div>
      </div>

      <div class="section-label">商品</div>
      <div class="card">
        <div v-for="(it, idx) in detail.items || []" :key="idx" class="goods-row">
          <img v-if="it.picUrl" :src="it.picUrl" alt="" />
          <div class="goods-info">
            <div class="goods-name">{{ it.productName || it.skuSpecs || '商品' }}</div>
            <div class="muted">{{ it.skuSpecs || '' }} · ×{{ it.quantity || 1 }}</div>
          </div>
        </div>
        <div v-if="!detail.items?.length" class="muted">无商品行</div>
      </div>

      <div class="card tip-card">
        <van-icon name="printer" color="#0f766e" />
        <div class="muted">打单请在电脑「发货中心」操作</div>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import { listPendingOmsOrders, type OMSOrder } from '../api/shipping'
import { formatOrderSource, formatTime, labelOmsStatus, labelShipStatus } from '../utils/labels'

const route = useRoute()
const router = useRouter()
const detail = ref<OMSOrder | null>(null)
const loading = ref(true)

const addrText = computed(() => {
  const a = detail.value?.address
  if (!a) return '-'
  return a.fullText || [a.province, a.city, a.district, a.address].filter(Boolean).join(' ') || '-'
})

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    const res = await listPendingOmsOrders({ keyword: String(id), page: 1, pageSize: 20 })
    detail.value = (res.list || []).find((o) => o.id === id) || res.list?.[0] || null
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
.detail-hero__sub {
  margin-top: 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
}
.tip-card {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
