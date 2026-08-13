<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="盘点明细表" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="SKU / 盘点单号" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRange" />
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="(row, idx) in list" :key="idx" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.skuCode || row.sku_code }}</div>
            <span class="ops-tag">差 {{ Number(row.diffQty ?? row.diff_qty ?? (Number(row.countQty ?? row.count_qty) - Number(row.bookQty ?? row.book_qty))) }}</span>
          </div>
          <div class="muted">账 {{ Number(row.bookQty ?? row.book_qty ?? 0) }} · 实 {{ Number(row.countQty ?? row.count_qty ?? 0) }}</div>
          <div class="muted">{{ row.docNo || row.doc_no || '' }} · {{ row.warehouseName || row.warehouse_name || '' }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无明细" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import { whApi } from '../../api/warehouse'
import { daysAgo, todayDay } from '../../utils/dateRange'

const router = useRouter()
const keyword = ref('')
const rangeStart = ref(daysAgo(30))
const rangeEnd = ref(todayDay())
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function onRange(p: { start: string; end: string }) {
  rangeStart.value = p.start
  rangeEnd.value = p.end
  reload()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listStocktakeDetails({
      keyword: keyword.value.trim() || undefined,
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
