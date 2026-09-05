<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="shop?.name || '店铺工作台'" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="requestSync">同步</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <div class="list-hint">
        {{ shop ? PLUGIN_STATUS_MAP[shop.pluginStatus].label : '' }}
        · 最近同步 {{ formatTime(lastSyncAt) || '—' }}
        <template v-if="shop?.syncRequested"> · 已请求同步</template>
      </div>
      <van-search v-model="keyword" shape="round" placeholder="售后编号 / 订单号 / 商品 / 物流" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <div v-for="group in groupedCards" :key="group.name" class="status-bar">
        <button type="button" class="status-chip group-name" :class="{ 'status-chip--urgent': group.name === '紧急' }">
          {{ group.name }}
        </button>
        <button
          v-for="card in group.items"
          :key="card.cardKey"
          type="button"
          class="status-chip"
          :class="{
            'status-chip--on': activeCardKey === card.cardKey,
            'status-chip--urgent': group.name === '紧急',
          }"
          @click="selectCard(card.cardKey)"
        >
          {{ card.cardLabel }}
          <span class="chip-count">{{ card.count }}</span>
        </button>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <AsTicketCard v-for="row in list" :key="row.id" :row="row" :now="nowTick" />
        <van-empty v-if="!loading && !list.length" description="暂无售后单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  PLUGIN_STATUS_MAP,
  aftersalesApi,
  type AftersaleTicket,
  type FilterCard,
  type MarketplaceShop,
} from '../../api/aftersales'
import { formatTime } from '../../utils/ticketLogistics'
import AsTicketCard from './AsTicketCard.vue'

const router = useRouter()
const route = useRoute()
const shopId = computed(() => Number(route.params.id))
const shop = ref<MarketplaceShop | null>(null)
const cards = ref<FilterCard[]>([])
const list = ref<AftersaleTicket[]>([])
const keyword = ref('')
const activeCardKey = ref('')
const lastSyncAt = ref('')
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const nowTick = ref(Date.now())
let tickTimer = 0

const groupedCards = computed(() => {
  const groups: { name: string; items: FilterCard[] }[] = []
  const index = new Map<string, number>()
  for (const card of cards.value) {
    const name = card.groupName || '其他'
    let i = index.get(name)
    if (i === undefined) {
      i = groups.length
      index.set(name, i)
      groups.push({ name, items: [] })
    }
    groups[i].items.push(card)
  }
  return groups
})

async function loadMore() {
  if (!shopId.value) {
    finished.value = true
    return
  }
  loading.value = true
  try {
    const data = await aftersalesApi.fetchShopWorkbench(shopId.value, {
      cardKey: activeCardKey.value || undefined,
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: 20,
    })
    shop.value = data.shop
    cards.value = data.cards || []
    lastSyncAt.value = data.lastSyncAt || data.shop.lastSyncAt || ''
    const rows = data.tickets || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 20 || list.value.length >= (data.total || 0)) finished.value = true
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

function selectCard(key: string) {
  activeCardKey.value = activeCardKey.value === key ? '' : key
  reload()
}

async function requestSync() {
  if (!shopId.value) return
  try {
    await aftersalesApi.requestShopSync(shopId.value)
    showSuccessToast('已请求同步')
    reload()
  } catch (e: any) {
    showFailToast(e.message || '请求失败')
  }
}

watch(shopId, () => {
  activeCardKey.value = ''
  keyword.value = ''
  reload()
})

onMounted(() => {
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

.group-name {
  opacity: 0.7;
  pointer-events: none;
}
</style>
