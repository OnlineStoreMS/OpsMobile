<template>
  <div class="page">
    <van-nav-bar title="待发货详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="list-item-title">{{ detail.orderNo }}</div>
        <div class="detail-row"><span class="label">履约</span><span class="value">{{ detail.status || '-' }}</span></div>
        <div class="detail-row"><span class="label">发货</span><span class="value">{{ detail.shipStatus || '-' }}</span></div>
        <div class="detail-row"><span class="label">渠道</span><span class="value">{{ detail.sourceChannel || '-' }} / {{ detail.platform || '-' }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">收件人</span><span class="value">{{ detail.buyerName || detail.address?.name || '-' }} {{ detail.buyerPhone || detail.address?.phone || '' }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ addrText }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.payTime) }}</span></div>
      </div>
      <div class="card">
        <div style="font-weight: 600; margin-bottom: 8px">商品</div>
        <div v-for="(it, idx) in detail.items || []" :key="idx" class="goods-row">
          <img v-if="it.picUrl" :src="it.picUrl" alt="" />
          <div class="goods-info">
            <div class="goods-name">{{ it.productName || '商品' }}</div>
            <div class="muted">{{ it.skuSpecs || '' }} · ×{{ it.quantity || 1 }}</div>
          </div>
        </div>
        <div v-if="!detail.items?.length" class="muted">无商品行</div>
      </div>
      <van-notice-bar left-icon="info-o" text="打单请在电脑发货中心操作" />
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import { listPendingOmsOrders, type OMSOrder } from '../api/shipping'

const route = useRoute()
const router = useRouter()
const detail = ref<OMSOrder | null>(null)
const loading = ref(true)

const addrText = computed(() => {
  const a = detail.value?.address
  if (!a) return '-'
  return a.fullText || [a.province, a.city, a.district, a.address].filter(Boolean).join(' ') || '-'
})

function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

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
