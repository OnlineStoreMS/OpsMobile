<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="库存汇总账" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="skuCode" shape="round" placeholder="SKU编码" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">查询</div>
        </template>
      </van-search>
      <div class="filter-bar">
        <button type="button" class="date-chip" :class="{ 'date-chip--on': !warehouseId }" @click="pickWh(0)">全部仓</button>
        <button
          v-for="w in warehouses.slice(0, 5)"
          :key="w.id"
          type="button"
          class="date-chip"
          :class="{ 'date-chip--on': warehouseId === w.id }"
          @click="pickWh(w.id)"
        >
          {{ w.name }}
        </button>
      </div>
      <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRange" />
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="(row, idx) in list" :key="idx" class="order-card">
          <div class="order-card__no">{{ row.skuCode || row.sku_code }}</div>
          <div class="muted">{{ row.warehouseName || row.warehouse_name || '' }}</div>
          <div class="sum-grid">
            <div><span class="muted">期初</span><strong>{{ num(row.beginQty ?? row.begin_qty) }}</strong></div>
            <div><span class="muted">入库</span><strong>{{ num(row.inQty ?? row.in_qty) }}</strong></div>
            <div><span class="muted">出库</span><strong>{{ num(row.outQty ?? row.out_qty) }}</strong></div>
            <div><span class="muted">期末</span><strong>{{ num(row.endQty ?? row.end_qty) }}</strong></div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无汇总" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import { whApi } from '../../api/warehouse'
import { todayDay, daysAgo } from '../../utils/dateRange'

const router = useRouter()
const skuCode = ref('')
const warehouseId = ref(0)
const rangeStart = ref(daysAgo(30))
const rangeEnd = ref(todayDay())
const warehouses = ref<any[]>([])
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function num(v: unknown) {
  return Number(v || 0)
}
function pickWh(id: number) {
  warehouseId.value = id
  reload()
}
function onRange(p: { start: string; end: string }) {
  rangeStart.value = p.start
  rangeEnd.value = p.end
  reload()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.stockSummary({
      skuCode: skuCode.value.trim() || undefined,
      warehouseId: warehouseId.value || undefined,
      from: rangeStart.value,
      to: rangeEnd.value,
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
    warehouses.value = (await whApi.listWarehouses({ page: 1, pageSize: 50 })).list || []
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
.sum-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
}
.sum-grid strong {
  margin-left: 6px;
  font-family: var(--ops-display);
}
</style>
