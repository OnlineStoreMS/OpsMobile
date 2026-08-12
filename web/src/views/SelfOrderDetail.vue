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
const loading = ref(true)

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
</style>
