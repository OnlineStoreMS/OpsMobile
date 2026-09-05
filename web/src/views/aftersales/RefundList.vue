<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="pageTitle" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" :placeholder="placeholder" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <ShopChips v-model="shopId" :shops="shops" @update:modelValue="reload" />
      <div v-if="showStatus" class="status-bar">
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': !status }"
          @click="setStatus('')"
        >
          全部物流
        </button>
        <button
          v-for="s in LOGISTICS_STATUS_OPTIONS"
          :key="s"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': status === s }"
          @click="setStatus(s)"
        >
          {{ s }}
        </button>
      </div>
      <div class="status-bar">
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': datePreset === 'all' }"
          @click="setDate('all')"
        >
          全部时间
        </button>
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': datePreset === '30d' }"
          @click="setDate('30d')"
        >
          近30天
        </button>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <AsTicketCard
          v-for="row in list"
          :key="`${row.shopId}-${row.platformAftersaleId}-${row.id}`"
          :row="row"
          :extra-tags="extraTagsOf(row)"
        />
        <van-empty v-if="!loading && !list.length" :description="`暂无${pageTitle}`" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import {
  LOGISTICS_STATUS_OPTIONS,
  aftersalesApi,
  type AsCardRow,
  type InterceptOrder,
  type MarketplaceShop,
  type ReturnPackage,
  type ShippedRefund,
} from '../../api/aftersales'
import { daysAgo, todayDay, toApiDateTimeRange } from '../../utils/dateRange'
import AsTicketCard from './AsTicketCard.vue'
import ShopChips from './ShopChips.vue'

type Mode = 'shipped' | 'return-refund' | 'intercept' | 'returns'
type Row = AsCardRow & { id: number; shopId: number; platformAftersaleId: string; needIntercept?: boolean; awaitPickup?: boolean }

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const shopId = ref<number | undefined>()
const status = ref('')
const datePreset = ref<'all' | '30d'>('all')
const shops = ref<MarketplaceShop[]>([])
const list = ref<Row[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const mode = computed<Mode>(() => (route.meta.mode as Mode) || 'shipped')
const pageTitle = computed(() => {
  if (mode.value === 'return-refund') return '退货退款成功'
  if (mode.value === 'intercept') return '需商家拦截快递'
  if (mode.value === 'returns') return '退回件'
  return '已发货退款成功'
})
const placeholder = computed(() =>
  mode.value === 'returns' ? '订单号 / 售后编号 / 物流单号 / 退回地' : '订单号 / 售后编号 / 商品 / 物流',
)
const showStatus = computed(() => mode.value === 'shipped' || mode.value === 'return-refund')

function applyRange() {
  if (datePreset.value !== '30d') return {}
  const range = toApiDateTimeRange(daysAgo(29), todayDay())
  return { applyFrom: range.start, applyTo: range.end }
}

function extraTagsOf(row: Row) {
  const tags: Array<{ label: string; type: 'danger' | 'warning' | 'primary' | 'success' }> = []
  if (row.needIntercept) tags.push({ label: '需商家拦截快递', type: 'danger' })
  if (row.awaitPickup) tags.push({ label: '待取件', type: 'danger' })
  return tags
}

function setStatus(v: string) {
  status.value = v
  reload()
}

function setDate(v: 'all' | '30d') {
  datePreset.value = v
  reload()
}

async function loadShops() {
  try {
    shops.value = await aftersalesApi.fetchShops()
  } catch {
    shops.value = []
  }
}

async function fetchPage() {
  const params = {
    shopId: shopId.value,
    keyword: keyword.value.trim() || undefined,
    page: page.value,
    pageSize: 20,
    ...applyRange(),
  }
  if (mode.value === 'intercept') {
    return aftersalesApi.fetchInterceptOrders(params)
  }
  if (mode.value === 'returns') {
    return aftersalesApi.fetchReturnPackages(params)
  }
  if (mode.value === 'return-refund') {
    return aftersalesApi.fetchReturnRefunds({ ...params, status: status.value || undefined })
  }
  return aftersalesApi.fetchShippedRefunds({ ...params, status: status.value || undefined })
}

function asRows(rows: Array<ShippedRefund | ReturnPackage | InterceptOrder>): Row[] {
  return rows as Row[]
}

async function loadMore() {
  loading.value = true
  try {
    const res = await fetchPage()
    const rows = asRows(res.list || [])
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

onMounted(() => {
  void loadShops()
})
</script>

<style scoped>
@import './as-common.css';
</style>
