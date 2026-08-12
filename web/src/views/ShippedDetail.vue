<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="已发货详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.mailNo || detail.sourceRef || `#${detail.id}` }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag ops-tag--ok">{{ shipStatusLabel(detail.status) }}</span>
        </div>
        <div class="detail-hero__sub">
          {{ detail.receiverName }} {{ detail.receiverMobile }}
        </div>
      </div>

      <div class="section-label">运单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">运单号</span><span class="value">{{ detail.mailNo || '-' }}</span></div>
        <div class="detail-row"><span class="label">来源单</span><span class="value">{{ detail.sourceRef || '-' }}</span></div>
        <div class="detail-row"><span class="label">订单来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">平台</span><span class="value">{{ detail.platform || '-' }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ addrText }}</span></div>
        <div class="detail-row"><span class="label">货物</span><span class="value">{{ detail.cargoName || '-' }}</span></div>
        <div class="detail-row"><span class="label">打印</span><span class="value">{{ formatTime(detail.printedAt || detail.createdAt) }}</span></div>
      </div>

      <div class="section-label" v-if="detail.items?.length">明细</div>
      <div class="card" v-if="detail.items?.length">
        <div v-for="(it, idx) in detail.items" :key="idx" class="goods-row">
          <div class="goods-info">
            <div class="goods-name">{{ it.goodsName }}</div>
            <div class="muted">{{ it.skuCode }} · ×{{ it.quantity }}</div>
          </div>
        </div>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到运单" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import { getShipment, type Shipment } from '../api/shipping'
import { formatOrderSource, formatTime } from '../utils/labels'

const route = useRoute()
const router = useRouter()
const detail = ref<Shipment | null>(null)
const loading = ref(true)

const addrText = computed(() => {
  const d = detail.value
  if (!d) return '-'
  return [d.receiverProvince, d.receiverCity, d.receiverCounty, d.receiverAddress].filter(Boolean).join(' ') || '-'
})

function shipStatusLabel(v?: string) {
  if (!v) return '已发货'
  if (v === 'printed') return '已打单'
  if (v === 'shipped') return '已发货'
  if (v === 'pending') return '待发货'
  return v
}

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    detail.value = await getShipment(id)
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
  background: linear-gradient(155deg, #0b1f2a, #163447 55%, #047857);
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
}
.detail-hero__tags .ops-tag,
.detail-hero__tags .ops-tag--ok {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.detail-hero__sub {
  margin-top: 14px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
}
</style>
