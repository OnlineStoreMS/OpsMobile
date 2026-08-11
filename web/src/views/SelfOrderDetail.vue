<template>
  <div class="page">
    <van-nav-bar title="自营订单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="list-item-title">{{ detail.soNo }}</div>
        <div class="detail-row"><span class="label">状态</span><span class="value">{{ detail.status }}</span></div>
        <div class="detail-row"><span class="label">付款</span><span class="value">{{ detail.payStatus || '-' }}</span></div>
        <div class="detail-row"><span class="label">OMS单号</span><span class="value">{{ detail.refTraceId || '-' }}</span></div>
        <div class="detail-row"><span class="label">金额</span><span class="value">¥{{ Number(detail.saleAmount || 0).toFixed(2) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">收件人</span><span class="value">{{ detail.buyerName }} {{ detail.buyerPhone }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ detail.address || '-' }}</span></div>
        <div class="detail-row"><span class="label">备注</span><span class="value">{{ detail.remark || '-' }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
        <div class="detail-row"><span class="label">发货</span><span class="value">{{ formatTime(detail.shippedAt) }}</span></div>
      </div>
      <div class="card">
        <div style="font-weight: 600; margin-bottom: 8px">商品</div>
        <div v-for="it in detail.items || []" :key="it.id" class="goods-row">
          <img v-if="it.picUrl" :src="it.picUrl" alt="" />
          <div class="goods-info">
            <div class="goods-name">{{ it.productName }}</div>
            <div class="muted">{{ it.skuSpecs || it.skuCode }} · ×{{ it.qty }} · ¥{{ Number(it.saleAmount || 0).toFixed(2) }}</div>
          </div>
        </div>
        <div v-if="!detail.items?.length" class="muted">无商品行</div>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import { getSelfOrder, type SelfOrderDetail } from '../api/selfOrder'

const route = useRoute()
const router = useRouter()
const detail = ref<SelfOrderDetail | null>(null)
const loading = ref(true)

function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

onMounted(async () => {
  const id = Number(route.params.id)
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    detail.value = await getSelfOrder(id)
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
    closeToast()
  }
})
</script>
