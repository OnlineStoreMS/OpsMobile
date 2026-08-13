<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="订单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="order-card__no">{{ detail.orderNo }}</div>
        <div class="tag-row">
          <van-tag plain type="primary">{{ labelOrderStatus(detail.status) }}</van-tag>
          <van-tag v-if="detail.shipStatus" plain>{{ labelShipStatus(detail.shipStatus) }}</van-tag>
        </div>
        <div class="kv"><span>买家</span><span>{{ detail.buyerName || detail.buyerNick || '-' }}</span></div>
        <div class="kv"><span>手机</span><span>{{ detail.buyerPhone || '-' }}</span></div>
        <div class="kv"><span>店铺</span><span>{{ detail.shopName || detail.platform || '-' }}</span></div>
        <div class="kv"><span>实付</span><span>¥{{ Number(detail.payAmount || 0).toFixed(2) }}</span></div>
        <div class="kv"><span>下单</span><span>{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
      </div>

      <div class="section-label">收件信息</div>
      <div class="card">
        <div>{{ addr.name || '-' }} · {{ addr.phone || '-' }}</div>
        <div class="muted addr">
          {{ [addr.province, addr.city, addr.district, addr.address].filter(Boolean).join(' ') || addr.fullText || '-' }}
        </div>
      </div>

      <div class="section-label">商品</div>
      <div v-for="(it, i) in items" :key="it.id || i" class="card item-card">
        <div class="goods-name">{{ it.productName || it.skuCode || '商品' }}</div>
        <div class="muted">{{ it.skuSpecs || it.skuCode || '' }}</div>
        <div class="card-foot">
          <span class="muted">×{{ it.quantity }}</span>
          <span>¥{{ Number(it.price || 0).toFixed(2) }}</span>
        </div>
      </div>
      <van-empty v-if="!items.length" description="无明细行" />
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { labelOrderStatus, labelShipStatus, omsApi } from '../../api/oms'

const router = useRouter()
const route = useRoute()
const detail = ref<any>(null)

const addr = computed(() => detail.value?.address || detail.value?.receiver || {})
const items = computed(() => detail.value?.items || [])

function formatTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

onMounted(async () => {
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
})
</script>

<style scoped>
.tag-row {
  display: flex;
  gap: 6px;
  margin: 8px 0 12px;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 4px 0;
}
.kv span:first-child {
  color: var(--ops-muted);
  flex-shrink: 0;
}
.addr {
  margin-top: 6px;
  line-height: 1.45;
}
.item-card {
  padding-bottom: 10px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.page-loading {
  padding-top: 48px;
}
</style>
