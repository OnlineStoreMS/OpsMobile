<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="采购订单" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="采购单号 / 供应商" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          @click="router.push(`/supply/purchase-orders/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.poNo }}</div>
            <van-tag plain type="primary">{{ labelPoStatus(row.status) }}</van-tag>
          </div>
          <div class="goods-name">{{ row.supplierName || '-' }}</div>
          <div class="muted">付款 {{ labelPayStatus(row.payStatus) }} · {{ row.itemCount || 0 }} 行</div>
          <div class="card-foot">
            <span class="muted">{{ formatTime(row.orderedAt || row.createdAt) }}</span>
            <span class="amt">¥{{ Number(row.totalAmount || 0).toFixed(2) }}</span>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无采购单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { labelPayStatus, labelPoStatus, supplyApi } from '../../api/supply'

const router = useRouter()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function loadMore() {
  loading.value = true
  try {
    const res = await supplyApi.listPurchaseOrders({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 20) finished.value = true
    else page.value += 1
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  void loadMore()
}
</script>

<style scoped>
.order-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}
.amt {
  font-weight: 700;
}
</style>
