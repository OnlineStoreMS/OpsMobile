<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="库存明细表" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="skuCode" shape="round" placeholder="SKU / 单据号" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">查询</div>
        </template>
      </van-search>
      <div class="filter-bar">
        <button
          v-for="t in typeChips"
          :key="t.value"
          type="button"
          class="date-chip"
          :class="{ 'date-chip--on': moveType === t.value }"
          @click="pickType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>
      <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRange" />
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="(row, idx) in list" :key="row.id || idx" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.skuCode || row.sku_code }}</div>
            <span class="ops-tag" :class="qtyClass(row)">{{ fmtQty(row) }}</span>
          </div>
          <div class="muted">
            {{ MOVE_TYPE_MAP[row.moveType || row.move_type] || row.moveType || row.move_type }}
            · {{ row.docNo || row.doc_no || '-' }}
          </div>
          <div class="muted">{{ row.warehouseName || row.warehouse_name || '' }} · {{ row.movedAt || row.moved_at || row.createdAt }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无流水" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import { MOVE_TYPE_MAP, whApi } from '../../api/warehouse'
import { todayDay, daysAgo } from '../../utils/dateRange'

const router = useRouter()
const skuCode = ref('')
const moveType = ref('')
const rangeStart = ref(daysAgo(30))
const rangeEnd = ref(todayDay())
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const typeChips = [
  { value: '', label: '全部' },
  { value: 'other_in', label: '其它入' },
  { value: 'other_out', label: '其它出' },
  { value: 'stocktake_gain', label: '盘盈' },
  { value: 'stocktake_loss', label: '盘亏' },
  { value: 'sale_out', label: '销售出' },
  { value: 'purchase_in', label: '采购入' },
]

function pickType(v: string) {
  moveType.value = v
  reload()
}
function onRange(p: { start: string; end: string }) {
  rangeStart.value = p.start
  rangeEnd.value = p.end
  reload()
}
function fmtQty(row: any) {
  const q = Number(row.qty ?? row.quantity ?? 0)
  return (q > 0 ? '+' : '') + q
}
function qtyClass(row: any) {
  const q = Number(row.qty ?? row.quantity ?? 0)
  return q >= 0 ? 'ops-tag--ok' : 'ops-tag--warn'
}

async function loadMore() {
  loading.value = true
  try {
    const kw = skuCode.value.trim()
    const res = await whApi.stockMovements({
      skuCode: kw || undefined,
      docNo: kw || undefined,
      moveType: moveType.value || undefined,
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
</script>

<style scoped>
.filter-bar {
  display: flex;
  gap: 8px;
  padding: 0 12px 8px;
  overflow-x: auto;
}
</style>
