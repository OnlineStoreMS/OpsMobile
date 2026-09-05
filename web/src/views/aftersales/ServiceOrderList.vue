<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="服务工单" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="工单ID / 订单号 / 商品 / 买家" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <ShopChips v-model="shopId" :shops="shops" :counts="shopCounts" :all-count="allShopCount" @update:modelValue="reload" />
      <div class="status-bar">
        <button
          v-for="tab in SERVICE_TABS"
          :key="tab"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': statusTab === tab }"
          @click="setTab(tab)"
        >
          {{ tab }}
          <span v-if="tabCount(tab)" class="chip-count">{{ tabCount(tab) }}</span>
        </button>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.id" class="order-card" @click="toggle(row.id)">
          <div class="prod-row">
            <img
              v-if="row.productImage"
              class="prod-pic pic-preview"
              :src="row.productImage"
              alt=""
              @click.stop="previewProductImage(row.productImage)"
            />
            <div v-else class="prod-pic prod-pic--empty">无图</div>
            <div class="prod-main">
              <div class="goods-name">{{ row.productTitle || '—' }}</div>
              <div class="muted meta">{{ row.shopName || '—' }}<template v-if="row.buyerNick"> · {{ row.buyerNick }}</template></div>
              <div class="card-foot">
                <van-tag plain :type="tabType(row.statusTab)">{{ row.statusTab }} {{ row.status }}</van-tag>
              </div>
            </div>
          </div>
          <div class="meta-grid">
            <div>订单 {{ row.orderNo || '—' }}</div>
            <div>工单 {{ row.platformServiceId || '—' }}</div>
            <div v-if="row.businessType || row.orderType">
              {{ [row.businessType, row.orderType, row.createSource].filter(Boolean).join(' · ') }}
            </div>
            <div v-if="timeoutLabel(row)" :class="timeoutClass(row)">{{ timeoutLabel(row) }}</div>
            <div v-if="row.createTime">创建 {{ formatTime(row.createTime) }}</div>
            <div v-if="row.lastLogTime">记录 {{ formatTime(row.lastLogTime) }}</div>
          </div>
          <div v-if="expanded === row.id" class="expand">
            <div v-if="row.productContent" class="block">{{ row.productContent }}</div>
            <div v-if="row.detail" class="block">{{ row.detail }}</div>
            <div v-if="row.solution" class="block">方案 {{ row.solution }}</div>
            <div v-if="row.lastLog" class="block">最新 {{ row.lastLog }}</div>
            <div v-if="row.tags" class="muted">{{ row.tags }}</div>
          </div>
          <div class="expand-hint">
            <span class="muted">{{ formatTime(row.syncedAt) ? `同步 ${formatTime(row.syncedAt)}` : '明细' }}</span>
            <span class="expand-link">{{ expanded === row.id ? '收起' : '展开' }}</span>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无服务工单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import {
  SERVICE_TABS,
  aftersalesApi,
  type MarketplaceShop,
  type ServiceOrder,
  type ServiceTabCount,
} from '../../api/aftersales'
import { previewProductImage } from '../../utils/previewProductImage'
import { formatTime, remainSecondsOf } from '../../utils/ticketLogistics'
import { loadShopChipCounts } from './shopCounts'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const shopId = ref<number | undefined>()
const shops = ref<MarketplaceShop[]>([])
const shopCounts = ref<Record<number, number>>({})
const allShopCount = ref(0)
const list = ref<ServiceOrder[]>([])
const tabs = ref<ServiceTabCount[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const expanded = ref<number | null>(null)
const nowTick = ref(Date.now())
let tickTimer = 0

const statusTab = computed({
  get() {
    const v = route.query.statusTab
    if (typeof v === 'string' && SERVICE_TABS.includes(v as (typeof SERVICE_TABS)[number])) return v
    return '待处理'
  },
  set(v: string) {
    router.replace({ path: route.path, query: { ...route.query, statusTab: v } })
  },
})

function tabCount(tab: string) {
  return tabs.value.find((t) => t.statusTab === tab)?.count || 0
}

function tabType(tab: string): 'danger' | 'warning' | 'primary' | 'success' {
  if (tab === '已逾期') return 'danger'
  if (tab === '待处理') return 'warning'
  return 'primary'
}

function remainOf(row: ServiceOrder) {
  void nowTick.value
  return remainSecondsOf(row)
}

function timeoutLabel(row: ServiceOrder) {
  const action = row.timeoutAction || '逾期'
  const sec = remainOf(row)
  if (row.statusTab === '已逾期' || (row.deadlineAt && sec <= 0)) {
    return action ? `已超时 · ${action}` : '已超时'
  }
  if (row.deadlineAt || sec > 0) {
    const h = Math.floor(Math.max(0, sec) / 3600)
    const m = Math.floor((Math.max(0, sec) % 3600) / 60)
    if (h > 0) return `${h}小时${m}分后${action}`
    return `${m}分后${action}`
  }
  return row.timeoutText || ''
}

function timeoutClass(row: ServiceOrder) {
  if (row.statusTab === '已逾期') return 'tone-danger'
  const sec = remainOf(row)
  if (!row.deadlineAt && !row.timeoutText && !sec) return ''
  if (sec <= 0 || sec <= 4 * 3600) return 'tone-danger'
  if (sec <= 12 * 3600) return 'tone-warning'
  return 'tone-ok'
}

function setTab(tab: string) {
  if (statusTab.value === tab) return
  statusTab.value = tab
}

function toggle(id: number) {
  expanded.value = expanded.value === id ? null : id
}

async function loadCounts() {
  try {
    const data = await loadShopChipCounts(shops.value, async (id) => {
      const res = await aftersalesApi.fetchServiceOrders({
        shopId: id,
        statusTab: statusTab.value || undefined,
        page: 1,
        pageSize: 1,
      })
      return res.total || 0
    })
    shopCounts.value = data.counts
    allShopCount.value = data.allCount
  } catch {
    shopCounts.value = {}
    allShopCount.value = 0
  }
}

async function loadShops() {
  try {
    shops.value = await aftersalesApi.fetchShops()
  } catch {
    shops.value = []
  }
  await loadCounts()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await aftersalesApi.fetchServiceOrders({
      shopId: shopId.value,
      statusTab: statusTab.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: 20,
    })
    tabs.value = res.tabs || []
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
  () => route.query.statusTab,
  () => {
    void loadCounts()
    reload()
  },
)

onMounted(() => {
  void loadShops()
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (tickTimer) window.clearInterval(tickTimer)
})
</script>

<style scoped>
@import './as-common.css';

.prod-row {
  display: flex;
  gap: 10px;
}
.prod-pic {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
}
.prod-pic--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--ops-muted);
}
.prod-main {
  min-width: 0;
  flex: 1;
}
.meta {
  font-size: 12px;
  margin-top: 2px;
}
.card-foot {
  margin-top: 6px;
}
.meta-grid {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ops-ink-soft);
}
.expand {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ops-line);
}
.block {
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 6px;
  white-space: pre-wrap;
}
.expand-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.expand-link {
  color: #be123c;
  font-weight: 600;
  font-size: 12px;
}
</style>
