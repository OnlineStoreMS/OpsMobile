<template>
  <div class="page">
    <van-nav-bar title="已发货详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="list-item-title">{{ detail.mailNo || detail.sourceRef || `#${detail.id}` }}</div>
        <div class="detail-row"><span class="label">状态</span><span class="value">{{ detail.status }}</span></div>
        <div class="detail-row"><span class="label">运单号</span><span class="value">{{ detail.mailNo || '-' }}</span></div>
        <div class="detail-row"><span class="label">来源单</span><span class="value">{{ detail.sourceRef || '-' }}</span></div>
        <div class="detail-row"><span class="label">平台</span><span class="value">{{ detail.platform || '-' }}</span></div>
        <div class="detail-row"><span class="label">收件人</span><span class="value">{{ detail.receiverName }} {{ detail.receiverMobile }}</span></div>
        <div class="detail-row"><span class="label">地址</span><span class="value">{{ addrText }}</span></div>
        <div class="detail-row"><span class="label">货物</span><span class="value">{{ detail.cargoName || '-' }}</span></div>
        <div class="detail-row"><span class="label">打印时间</span><span class="value">{{ formatTime(detail.printedAt || detail.createdAt) }}</span></div>
      </div>
      <div class="card" v-if="detail.items?.length">
        <div style="font-weight: 600; margin-bottom: 8px">明细</div>
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

const route = useRoute()
const router = useRouter()
const detail = ref<Shipment | null>(null)
const loading = ref(true)

const addrText = computed(() => {
  const d = detail.value
  if (!d) return '-'
  return [d.receiverProvince, d.receiverCity, d.receiverCounty, d.receiverAddress].filter(Boolean).join(' ') || '-'
})

function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
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
