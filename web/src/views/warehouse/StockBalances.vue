<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="库存查询" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="SKU / 名称" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <div class="filter-bar">
        <button type="button" class="date-chip" :class="{ 'date-chip--on': !warehouseId }" @click="pickWh(0)">全部仓</button>
        <button
          v-for="w in warehouses.slice(0, 6)"
          :key="w.id"
          type="button"
          class="date-chip"
          :class="{ 'date-chip--on': warehouseId === w.id }"
          @click="pickWh(w.id)"
        >
          {{ w.name }}
        </button>
        <button type="button" class="date-chip" :class="{ 'date-chip--on': hideZero }" @click="toggleZero">
          隐藏零库存
        </button>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="`${row.warehouseId}-${row.invSkuId || row.id}`" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.skuCode || row.sku_code }}</div>
            <strong class="qty">{{ Number(row.onHand ?? row.on_hand ?? 0) }}</strong>
          </div>
          <div class="muted">{{ row.pickName || row.productName || row.sku_name || '' }}</div>
          <div class="muted">仓 {{ row.warehouseName || row.warehouse_name || row.warehouseId }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无库存" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { whApi } from '../../api/warehouse'

const router = useRouter()
const keyword = ref('')
const warehouseId = ref(0)
const hideZero = ref(true)
const warehouses = ref<any[]>([])
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function pickWh(id: number) {
  warehouseId.value = id
  reload()
}
function toggleZero() {
  hideZero.value = !hideZero.value
  reload()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.stockBalances({
      keyword: keyword.value.trim() || undefined,
      warehouseId: warehouseId.value || undefined,
      hideZero: hideZero.value,
      page: page.value,
      pageSize: 30,
    })
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 30) finished.value = true
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

onMounted(async () => {
  try {
    const res = await whApi.listWarehouses({ page: 1, pageSize: 50 })
    warehouses.value = res.list || []
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  padding: 0 12px 8px;
  overflow-x: auto;
}
.qty {
  font-family: var(--ops-display);
  font-size: 18px;
  color: var(--ops-primary);
}
</style>
