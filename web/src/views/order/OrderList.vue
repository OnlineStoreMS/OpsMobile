<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="订单号 / 手机号 / 买家" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          @click="router.push(`/order/orders/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.orderNo }}</div>
            <van-tag plain type="primary">{{ labelOrderStatus(row.status) }}</van-tag>
          </div>
          <div class="goods-name">{{ row.buyerName || row.buyerNick || '-' }} · {{ row.buyerPhone || '-' }}</div>
          <div class="muted">
            {{ row.shopName || row.platform || row.sourceChannel || '' }}
            <template v-if="row.shipStatus"> · {{ labelShipStatus(row.shipStatus) }}</template>
          </div>
          <div class="card-foot">
            <span class="muted">{{ formatTime(row.orderedAt || row.createdAt) }}</span>
            <span class="amt" v-if="row.payAmount != null">¥{{ Number(row.payAmount).toFixed(2) }}</span>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无订单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { labelOrderStatus, labelShipStatus, omsApi } from '../../api/oms'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const statusFilter = computed(() => {
  const s = route.query.status
  return typeof s === 'string' && s ? s : ''
})

const navTitle = computed(() => {
  if (statusFilter.value === 'pending_alloc') return '待分配'
  if (statusFilter.value === 'allocated') return '已分配'
  return '全部订单'
})

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function loadMore() {
  loading.value = true
  try {
    const res = await omsApi.listOrders({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
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

watch(
  () => route.query.status,
  () => reload(),
)
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
  align-items: center;
  margin-top: 8px;
}
.amt {
  font-weight: 700;
  color: var(--ops-ink);
}
</style>
