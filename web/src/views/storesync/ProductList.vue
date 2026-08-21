<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="电商商品" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search
        v-model="keyword"
        shape="round"
        placeholder="SKU 规格名称"
        show-action
        clearable
        @search="reload"
      >
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="status-bar">
        <button
          v-for="opt in PLATFORM_OPTIONS"
          :key="opt.value"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': platform === opt.value }"
          @click="setPlatform(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="status-bar">
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': !shopId }"
          @click="setShop('')"
        >
          全部店铺
          <span v-if="allShopCount != null" class="chip-count">上架 {{ allShopCount }}</span>
        </button>
        <button
          v-for="s in platformShops"
          :key="s.mallUserId"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': shopId === s.mallUserId }"
          @click="setShop(s.mallUserId)"
        >
          {{ s.mallUserName || s.mallUserId }}
          <span v-if="shopCountOf(s.mallUserId) != null" class="chip-count">
            {{ shopCountOf(s.mallUserId) }}
          </span>
        </button>
      </div>
      <div class="status-bar">
        <button
          v-for="opt in PRODUCT_TYPE_OPTIONS"
          :key="opt.value || 'all'"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': typeFilter === opt.value }"
          @click="setType(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.itemId"
          class="order-card"
          :class="{ 'order-card--open': expandedId === row.itemId }"
          @click="toggleExpand(row)"
        >
          <div class="prod-row">
            <img
              v-if="row.picUrl"
              class="prod-pic pic-preview"
              :src="row.picUrl"
              alt=""
              @click.stop="previewProductImage(row.picUrl)"
            />
            <div class="prod-pic prod-pic--empty" v-else>无图</div>
            <div class="prod-main">
              <div class="goods-name">{{ row.title || row.shortTitle || '-' }}</div>
              <div class="muted meta-line">
                {{ row.shopName || '-' }}
                <template v-if="row.productNum"> · {{ row.productNum }}</template>
              </div>
              <div class="card-foot">
                <van-tag plain type="primary">{{ row.approveStatusLabel || row.approveStatus || '-' }}</van-tag>
                <span class="amt">¥{{ row.price || '0' }}</span>
              </div>
              <div class="muted meta-line expand-hint">
                库存 {{ row.stock ?? 0 }} · SKU {{ row.skus?.length || 0 }}
                <span class="expand-link">{{ expandedId === row.itemId ? '收起' : '查看SKU' }}</span>
              </div>
            </div>
          </div>

          <div v-if="expandedId === row.itemId" class="sku-panel" @click.stop>
            <div v-if="!row.skus?.length" class="muted sku-empty">无 SKU 明细</div>
            <div v-for="sku in row.skus || []" :key="sku.skuId || sku.outerId" class="sku-row">
              <img
                v-if="sku.picUrl || row.picUrl"
                class="sku-pic pic-preview"
                :src="sku.picUrl || row.picUrl"
                alt=""
                @click="previewProductImage(sku.picUrl || row.picUrl || '')"
              />
              <div v-else class="sku-pic sku-pic--empty">-</div>
              <div class="sku-main">
                <div class="sku-spec">{{ sku.propertiesName || sku.shortTitle || '默认规格' }}</div>
                <div class="muted meta-line">
                  <template v-if="sku.skuId">{{ sku.skuId }}</template>
                  <template v-if="sku.outerId"> · {{ sku.outerId }}</template>
                </div>
                <div class="card-foot">
                  <span class="muted">库存 {{ sku.quantity ?? 0 }}</span>
                  <span class="amt">¥{{ sku.price || '0' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无电商商品" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import {
  PLATFORM_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  storesyncApi,
  type SyncProduct,
  type SyncShop,
} from '../../api/storesync'
import { previewProductImage } from '../../utils/previewProductImage'

const router = useRouter()
const keyword = ref('')
const platform = ref('FXG')
const shopId = ref('')
const typeFilter = ref('')
const shops = ref<SyncShop[]>([])
const shopCounts = ref<Record<string, number>>({})
const list = ref<SyncProduct[]>([])
const loading = ref(false)
const finished = ref(false)
const pageNo = ref(1)
const expandedId = ref('')

const platformShops = computed(() =>
  shops.value.filter((s) => !platform.value || s.platform === platform.value),
)

const allShopCount = computed(() => {
  const ids = platformShops.value.map((s) => s.mallUserId)
  if (!ids.length) return null
  let sum = 0
  let any = false
  for (const id of ids) {
    const n = shopCounts.value[id]
    if (n == null) continue
    any = true
    sum += n
  }
  return any ? sum : null
})

function shopCountOf(mallUserId: string) {
  const n = shopCounts.value[mallUserId]
  return n == null ? null : n
}

function setPlatform(v: string) {
  platform.value = v
  if (shopId.value && !platformShops.value.some((s) => s.mallUserId === shopId.value)) {
    shopId.value = ''
  }
  expandedId.value = ''
  void loadShopCounts()
  reload()
}

function setShop(v: string) {
  shopId.value = v
  expandedId.value = ''
  reload()
}

function setType(v: string) {
  typeFilter.value = v
  expandedId.value = ''
  reload()
}

function toggleExpand(row: SyncProduct) {
  expandedId.value = expandedId.value === row.itemId ? '' : row.itemId
}

async function loadShops() {
  try {
    const res = await storesyncApi.listShops()
    shops.value = res.items || []
  } catch {
    shops.value = []
  }
}

/** 店铺旁数字固定为上架商品数（与列表状态筛选无关） */
async function loadShopCounts() {
  const targets = platformShops.value
  if (!targets.length) {
    shopCounts.value = {}
    return
  }
  const next: Record<string, number> = {}
  // 串行，避免快递助手限流
  for (const s of targets) {
    try {
      const res = await storesyncApi.listProducts({
        platform: platform.value || s.platform,
        shopId: s.mallUserId,
        type: 'onsale',
        pageNo: 1,
        pageSize: 1,
      })
      next[s.mallUserId] = res.total ?? 0
    } catch {
      /* 单店失败跳过 */
    }
  }
  shopCounts.value = next
}

async function loadMore() {
  loading.value = true
  try {
    const kw = keyword.value.trim()
    const res = await storesyncApi.listProducts({
      platform: platform.value,
      shopId: shopId.value || undefined,
      type: typeFilter.value || undefined,
      spuPropertiesName: kw || undefined,
      pageNo: pageNo.value,
      pageSize: 20,
    })
    const rows = res.items || []
    list.value = pageNo.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 20) finished.value = true
    else pageNo.value += 1
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNo.value = 1
  finished.value = false
  list.value = []
  void loadMore()
}

onMounted(async () => {
  await loadShops()
  void loadShopCounts()
})
</script>

<style scoped>
.status-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 4px 12px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.status-bar::-webkit-scrollbar {
  display: none;
}
.status-chip {
  flex: 0 0 auto;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.status-chip--on {
  color: #be123c;
  border-color: rgba(225, 29, 72, 0.35);
  background: rgba(225, 29, 72, 0.08);
}
.chip-count {
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}
.order-card--open {
  border-color: rgba(225, 29, 72, 0.35);
}
.prod-row {
  display: flex;
  gap: 10px;
}
.prod-pic,
.sku-pic {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
}
.sku-pic {
  width: 48px;
  height: 48px;
  border-radius: 8px;
}
.prod-pic--empty,
.sku-pic--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--ops-muted);
}
.prod-main,
.sku-main {
  min-width: 0;
  flex: 1;
}
.meta-line {
  font-size: 12px;
  margin-top: 2px;
}
.expand-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.expand-link {
  color: #be123c;
  font-weight: 600;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  gap: 8px;
}
.amt {
  font-weight: 700;
}
.sku-panel {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ops-line);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sku-row {
  display: flex;
  gap: 8px;
}
.sku-spec {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
}
.sku-empty {
  font-size: 12px;
  padding: 4px 0;
}
</style>
