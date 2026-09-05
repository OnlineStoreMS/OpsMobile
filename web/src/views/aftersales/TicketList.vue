<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="meta.title" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" :placeholder="meta.placeholder" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <ShopChips v-model="shopId" :shops="shops" @update:modelValue="reload" />
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
import { showFailToast } from 'vant'
import {
  TICKET_KIND_META,
  aftersalesApi,
  type AftersaleTicket,
  type MarketplaceShop,
  type ShopTicketKind,
} from '../../api/aftersales'
import AsTicketCard from './AsTicketCard.vue'
import ShopChips from './ShopChips.vue'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const shopId = ref<number | undefined>()
const shops = ref<MarketplaceShop[]>([])
const list = ref<AftersaleTicket[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const nowTick = ref(Date.now())
let tickTimer = 0

const kind = computed<ShopTicketKind>(() => {
  const v = route.query.kind
  if (v === 'review-shipped-refund' || v === 'buyer-return-signed') return v
  return 'buyer-return-pickup'
})
const meta = computed(() => TICKET_KIND_META[kind.value])

async function loadShops() {
  try {
    shops.value = await aftersalesApi.fetchShops()
  } catch {
    shops.value = []
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await aftersalesApi.fetchShopTicketsByKind({
      kind: kind.value,
      shopId: shopId.value,
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

watch(
  () => route.query.kind,
  () => {
    keyword.value = ''
    shopId.value = undefined
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
</style>
