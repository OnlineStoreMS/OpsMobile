<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="采购单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="order-card__no">{{ detail.poNo }}</div>
        <div class="tag-row">
          <van-tag plain type="primary">{{ labelPoStatus(detail.status) }}</van-tag>
          <van-tag plain>{{ labelPayStatus(detail.payStatus) }}</van-tag>
        </div>
        <div class="kv"><span>供应商</span><span>{{ detail.supplierName || '-' }}</span></div>
        <div class="kv"><span>采购额</span><span>¥{{ Number(detail.totalAmount || 0).toFixed(2) }}</span></div>
        <div class="kv"><span>销售额</span><span>¥{{ Number(detail.saleAmount || 0).toFixed(2) }}</span></div>
        <div class="kv"><span>下单</span><span>{{ formatTime(detail.orderedAt || detail.createdAt) }}</span></div>
        <div class="kv" v-if="detail.remark"><span>备注</span><span>{{ detail.remark }}</span></div>
      </div>

      <div class="section-label">明细</div>
      <div v-for="(it, i) in detail.items || []" :key="it.id || i" class="card">
        <div class="goods-name">{{ it.productName || it.skuCode || 'SKU' }}</div>
        <div class="muted">{{ it.skuSpecs || it.skuCode || '' }}</div>
        <div class="card-foot">
          <span class="muted">×{{ it.qty }} · 已收 {{ it.receivedQty || 0 }}</span>
          <span>¥{{ Number(it.unitPrice || 0).toFixed(2) }}</span>
        </div>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { labelPayStatus, labelPoStatus, supplyApi } from '../../api/supply'

const router = useRouter()
const route = useRoute()
const detail = ref<any>(null)

function formatTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) return
  try {
    detail.value = await supplyApi.getPurchaseOrder(id)
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
.card-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.page-loading {
  padding-top: 48px;
}
</style>
