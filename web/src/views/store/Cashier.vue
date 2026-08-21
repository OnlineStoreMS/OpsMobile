<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="收银台" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-action" @click="showCart = true">购物车 {{ cartQty }}</span>
      </template>
    </van-nav-bar>

    <div class="list-shell list-shell--batch">
      <div class="store-pick" @click="showStorePicker = true">
        <span class="muted">门店</span>
        <span class="store-pick__name">{{ currentStore?.name || '请选择门店' }}</span>
        <van-icon name="arrow" />
      </div>

      <div class="tab-bar">
        <button type="button" class="tab-btn" :class="{ 'tab-btn--on': tab === 'product' }" @click="setTab('product')">
          商品
        </button>
        <button type="button" class="tab-btn" :class="{ 'tab-btn--on': tab === 'service' }" @click="setTab('service')">
          服务
        </button>
      </div>

      <van-search
        v-model="keyword"
        shape="round"
        :placeholder="searchPlaceholder"
        show-action
        clearable
        @search="doSearch"
        @clear="onClearSearch"
      >
        <template #action>
          <div class="search-action" @click="doSearch">搜索</div>
        </template>
      </van-search>

      <van-loading v-if="searching" class="pad-load" size="24px">查询中…</van-loading>

      <template v-else-if="tab === 'product'">
        <div v-for="row in skuHits" :key="row.skuId" class="order-card hit-card" @click="addSku(row)">
          <div class="prod-row">
            <img v-if="row.pic || row.productPic" class="prod-pic" :src="row.pic || row.productPic" alt="" />
            <div v-else class="prod-pic prod-pic--empty">SKU</div>
            <div class="prod-main">
              <div class="goods-name">{{ row.productName }}</div>
              <div class="muted meta-line">{{ row.specLabel || '-' }} · {{ row.skuCode || row.skuId }}</div>
              <div class="card-foot">
                <span class="muted">库存 {{ row.storeQty ?? row.stock ?? 0 }}</span>
                <div class="hit-right">
                  <span class="amt">¥{{ Number(row.price || 0).toFixed(2) }}</span>
                  <van-button size="mini" type="primary" round hairline @click.stop="addSku(row)">加入</van-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <van-empty
          v-if="!skuHits.length"
          :description="searched ? '未找到商品' : '输入商品名 / 编码搜索加购'"
        />
      </template>

      <template v-else>
        <div v-for="row in serviceHits" :key="row.id" class="order-card hit-card" @click="addService(row)">
          <div class="goods-name">{{ row.name }}</div>
          <div class="muted meta-line">
            {{ row.categoryName || '未分类' }}
            <template v-if="row.durationMin"> · {{ row.durationMin }} 分钟</template>
            <template v-if="row.code"> · {{ row.code }}</template>
          </div>
          <div class="card-foot">
            <span class="muted">点选加入购物车</span>
            <div class="hit-right">
              <span class="amt">¥{{ Number(row.price || 0).toFixed(2) }}</span>
              <van-button size="mini" type="primary" round hairline @click.stop="addService(row)">加入</van-button>
            </div>
          </div>
        </div>
        <van-empty
          v-if="!serviceHits.length"
          :description="searched ? '未找到服务' : '输入服务名 / 编码搜索，或点搜索加载全部'"
        />
      </template>
    </div>

    <div class="batch-bar">
      <div class="batch-bar__info" @click="showCart = true">
        {{ cart.length }} 种 · {{ cartQty }} 件 · ¥{{ cartTotal.toFixed(2) }}
      </div>
      <van-button size="small" round plain hairline :disabled="!cart.length" @click="showCart = true">明细</van-button>
      <van-button size="small" type="primary" round :disabled="!canCheckout" :loading="checkingOut" @click="openCheckout">
        结算
      </van-button>
    </div>

    <van-action-sheet v-model:show="showStorePicker" title="选择门店" :actions="storeActions" @select="onPickStore" />

    <van-popup v-model:show="showCart" position="bottom" round :style="{ maxHeight: '78%' }">
      <div class="cart-sheet">
        <div class="cart-sheet__title">购物车 · ¥{{ cartTotal.toFixed(2) }}</div>
        <div v-for="(line, idx) in cart" :key="idx" class="cart-line">
          <div class="cart-line__main">
            <div class="goods-name">{{ line.productName }}</div>
            <div class="muted meta-line">
              <van-tag plain size="medium">{{ line.itemType === 'service' ? '服务' : '商品' }}</van-tag>
              {{ line.specLabel || line.skuCode || '' }}
            </div>
          </div>
          <div class="cart-line__ops">
            <van-stepper v-model="line.quantity" min="1" integer />
            <span class="amt">¥{{ (Number(line.unitPrice) * Number(line.quantity)).toFixed(2) }}</span>
            <van-icon name="delete-o" @click="cart.splice(idx, 1)" />
          </div>
        </div>
        <van-empty v-if="!cart.length" description="购物车为空" />
        <div class="cart-sheet__pay">
          <button
            v-for="p in payMethods"
            :key="p.value"
            type="button"
            class="status-chip"
            :class="{ 'status-chip--on': paymentMethod === p.value }"
            @click="paymentMethod = p.value"
          >
            {{ p.label }}
          </button>
        </div>
        <van-button block type="primary" round :disabled="!canCheckout" :loading="checkingOut" @click="checkout">
          确认结算 ¥{{ cartTotal.toFixed(2) }}
        </van-button>
      </div>
    </van-popup>

    <van-popup v-model:show="showReceipt" position="bottom" round :style="{ height: '88%' }">
      <div class="receipt-sheet">
        <div class="cart-sheet__title">小票 · {{ lastOrderNo }}</div>
        <div class="paper-scroll">
          <div ref="receiptPaperRef" class="paper" v-html="receiptHtml" />
        </div>
        <div class="sheet-actions">
          <van-button round plain hairline :loading="exporting" @click="copyReceipt">复制图片</van-button>
          <van-button round plain hairline type="primary" :loading="exporting" @click="downloadReceipt">下载</van-button>
          <van-button round type="primary" @click="showReceipt = false">完成</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  storeApi,
  type OrderLine,
  type ProductSkuSearchItem,
  type ServiceItem,
  type Store,
} from '../../api/store'
import { copyCanvasPng, downloadCanvasPng, renderElementToCanvas } from '../../utils/htmlToImage'

const router = useRouter()
const stores = ref<Store[]>([])
const storeId = ref(0)
const keyword = ref('')
const tab = ref<'product' | 'service'>('product')
const searching = ref(false)
const searched = ref(false)
const skuHits = ref<ProductSkuSearchItem[]>([])
const serviceHits = ref<ServiceItem[]>([])
const cart = ref<OrderLine[]>([])
const showCart = ref(false)
const showStorePicker = ref(false)
const paymentMethod = ref('cash')
const checkingOut = ref(false)
const showReceipt = ref(false)
const receiptHtml = ref('')
const lastOrderNo = ref('')
const receiptPaperRef = ref<HTMLElement>()
const exporting = ref(false)

const payMethods = [
  { value: 'cash', label: '现金' },
  { value: 'static_qr', label: '收款码' },
]

const currentStore = computed(() => stores.value.find((s) => s.id === storeId.value))
const cartTotal = computed(() =>
  cart.value.reduce((sum, l) => sum + Number(l.unitPrice || 0) * Number(l.quantity || 0), 0),
)
const cartQty = computed(() => cart.value.reduce((sum, l) => sum + Number(l.quantity || 0), 0))
const canCheckout = computed(() => !!storeId.value && cart.value.length > 0)
const searchPlaceholder = computed(() =>
  tab.value === 'service' ? '服务名称 / 编码' : '商品名 / SKU 编码 / 扫码',
)

const storeActions = computed(() =>
  stores.value.map((s) => ({ name: s.name, subname: s.code, storeId: s.id })),
)

async function loadStores() {
  try {
    const res = await storeApi.listStores('', 1, 50)
    stores.value = (res.list || []).filter((s) => s.status !== 0)
    if (!storeId.value && stores.value[0]) storeId.value = stores.value[0].id
  } catch (e: any) {
    showFailToast(e.message || '加载门店失败')
  }
}

function onPickStore(action: { storeId?: number; name: string }) {
  if (action.storeId) storeId.value = action.storeId
  showStorePicker.value = false
}

function setTab(next: 'product' | 'service') {
  if (tab.value === next) return
  tab.value = next
  searched.value = false
  if (next === 'product') {
    skuHits.value = []
  } else {
    serviceHits.value = []
  }
  if (keyword.value.trim()) void doSearch()
  else if (next === 'service') void loadServices()
}

function onClearSearch() {
  searched.value = false
  if (tab.value === 'product') skuHits.value = []
  else void loadServices()
}

async function doSearch() {
  if (tab.value === 'product') await searchProducts()
  else await searchServices()
}

async function searchProducts() {
  const kw = keyword.value.trim()
  if (!kw) {
    showFailToast('请输入商品关键词')
    return
  }
  searching.value = true
  searched.value = true
  try {
    const res = await storeApi.searchProductSkus({ keyword: kw, page: 1, pageSize: 40 })
    skuHits.value = res.list || []
  } catch (e: any) {
    showFailToast(e.message || '查询失败')
  } finally {
    searching.value = false
  }
}

async function searchServices() {
  searching.value = true
  searched.value = !!keyword.value.trim()
  try {
    const res = await storeApi.listServiceItems({
      keyword: keyword.value.trim() || undefined,
      status: 1,
      page: 1,
      pageSize: 50,
    })
    serviceHits.value = res.list || []
  } catch (e: any) {
    showFailToast(e.message || '搜索服务失败')
  } finally {
    searching.value = false
  }
}

async function loadServices() {
  searching.value = true
  searched.value = false
  try {
    const res = await storeApi.listServiceItems({ status: 1, page: 1, pageSize: 50 })
    serviceHits.value = res.list || []
  } catch (e: any) {
    showFailToast(e.message || '加载服务失败')
  } finally {
    searching.value = false
  }
}

function addSku(row: ProductSkuSearchItem) {
  const exist = cart.value.find((l) => l.itemType === 'product' && l.skuId === row.skuId)
  if (exist) exist.quantity += 1
  else {
    cart.value.push({
      itemType: 'product',
      skuId: row.skuId,
      productName: row.productName,
      skuCode: row.skuCode,
      specLabel: row.specLabel,
      pic: row.pic || row.productPic,
      quantity: 1,
      originalPrice: row.price,
      unitPrice: row.price,
    })
  }
  showSuccessToast('已加入')
}

function addService(row: ServiceItem) {
  const exist = cart.value.find((l) => l.itemType === 'service' && l.serviceItemId === row.id)
  if (exist) exist.quantity += 1
  else {
    cart.value.push({
      itemType: 'service',
      serviceItemId: row.id,
      productName: row.name,
      skuCode: row.code,
      quantity: 1,
      originalPrice: row.price,
      unitPrice: row.price,
    })
  }
  showSuccessToast('已加入')
}

function openCheckout() {
  if (!canCheckout.value) {
    showFailToast('请先选择门店并加入商品/服务')
    return
  }
  showCart.value = true
}

async function checkout() {
  if (!canCheckout.value) {
    showFailToast('请先选择门店并加入商品/服务')
    return
  }
  checkingOut.value = true
  try {
    const order = await storeApi.createPosOrder({
      storeId: storeId.value,
      paymentMethod: paymentMethod.value,
      items: cart.value.map((l) => ({
        ...l,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      })),
    })
    lastOrderNo.value = order.orderNo
    receiptHtml.value =
      order.receiptHtml ||
      `<div style="padding:12px;font-family:sans-serif"><div>单号 ${order.orderNo}</div><div style="margin-top:8px;font-size:18px;font-weight:700">合计 ¥${Number(order.totalAmount).toFixed(2)}</div></div>`
    cart.value = []
    showCart.value = false
    showReceipt.value = true
    showSuccessToast('结算成功')
  } catch (e: any) {
    showFailToast(e.message || '结算失败')
  } finally {
    checkingOut.value = false
  }
}

async function withReceiptCanvas(action: (canvas: HTMLCanvasElement) => Promise<void>) {
  if (exporting.value) return
  const el = receiptPaperRef.value
  if (!el) {
    showFailToast('暂无小票内容')
    return
  }
  exporting.value = true
  try {
    const canvas = await renderElementToCanvas(el, { widthPx: 360, scale: 2 })
    await action(canvas)
  } catch (e: any) {
    showFailToast(e.message || '操作失败')
  } finally {
    exporting.value = false
  }
}

async function downloadReceipt() {
  await withReceiptCanvas(async (canvas) => {
    downloadCanvasPng(canvas, `receipt-${lastOrderNo.value || Date.now()}.png`)
    showSuccessToast('已下载')
  })
}

async function copyReceipt() {
  await withReceiptCanvas(async (canvas) => {
    await copyCanvasPng(canvas)
    showSuccessToast('图片已复制')
  })
}

onMounted(() => {
  void loadStores()
})
</script>

<style scoped>
.nav-action {
  font-size: 14px;
  color: var(--ops-primary);
  padding: 0 4px;
}
.list-shell--batch {
  padding-bottom: calc(64px + var(--ops-safe-bottom));
}
.store-pick {
  margin: 8px 12px 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid var(--ops-line);
  display: flex;
  align-items: center;
  gap: 8px;
}
.store-pick__name {
  flex: 1;
  font-weight: 700;
  min-width: 0;
}
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 8px 12px 0;
}
.tab-btn {
  flex: 1;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  border-radius: 999px;
  padding: 8px;
  font-weight: 600;
  color: var(--ops-muted);
}
.tab-btn--on {
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.1);
}
.pad-load {
  padding: 24px;
  text-align: center;
}
.hit-card:active {
  opacity: 0.92;
}
.prod-row {
  display: flex;
  gap: 10px;
}
.prod-pic {
  width: 56px;
  height: 56px;
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
.meta-line {
  font-size: 12px;
  margin-top: 2px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  gap: 8px;
}
.hit-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.amt {
  font-weight: 700;
}
.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px calc(10px + var(--ops-safe-bottom));
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid var(--ops-line);
}
.batch-bar__info {
  font-size: 13px;
  font-weight: 700;
  margin-right: auto;
  min-width: 0;
}
.cart-sheet,
.receipt-sheet {
  padding: 16px 16px calc(16px + var(--ops-safe-bottom));
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.cart-sheet__title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  flex-shrink: 0;
}
.cart-line {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--ops-line);
}
.cart-line__ops {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cart-sheet__pay {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.status-chip {
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.status-chip--on {
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.1);
}
.paper-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #eef2f6;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.paper {
  width: 360px;
  max-width: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(15, 31, 42, 0.08);
  font-size: 12px;
  line-height: 1.45;
  overflow: hidden;
}
.paper :deep(img) {
  max-width: 100%;
  height: auto;
}
.paper :deep(table) {
  width: 100% !important;
  max-width: 100% !important;
  font-size: 12px !important;
}
.sheet-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.sheet-actions .van-button {
  flex: 1;
}
</style>
