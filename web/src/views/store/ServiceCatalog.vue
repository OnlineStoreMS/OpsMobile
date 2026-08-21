<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="服务目录" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-action" @click="openCreate">新增</span>
      </template>
    </van-nav-bar>

    <div class="list-shell" :class="{ 'list-shell--batch': selectMode }">
      <van-search v-model="keyword" shape="round" placeholder="服务名称 / 编码" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="status-bar">
        <button
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': !categoryId }"
          @click="setCategory(0)"
        >
          全部
        </button>
        <button
          v-for="c in flatCategories"
          :key="c.id"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': categoryId === c.id }"
          @click="setCategory(c.id)"
        >
          {{ c.name }}
        </button>
      </div>

      <div class="hint-row">
        <span class="muted">{{ selectMode ? `已选 ${selectedIds.size} 项` : '可多选生成价目表' }}</span>
        <span class="nav-action" @click="toggleSelectMode">{{ selectMode ? '取消' : '多选' }}</span>
      </div>

      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          :class="{ 'order-card--selected': selectedIds.has(row.id) }"
          @click="onCardClick(row)"
        >
          <div class="order-card__top">
            <div class="order-card__left">
              <van-checkbox
                v-if="selectMode"
                :model-value="selectedIds.has(row.id)"
                @click.stop
                @update:model-value="(v: boolean) => toggleSelect(row.id, v)"
              />
              <div class="goods-name">{{ row.name }}</div>
            </div>
            <span class="amt">¥{{ Number(row.price || 0).toFixed(2) }}</span>
          </div>
          <div class="muted meta-line">
            {{ row.categoryName || '未分类' }}
            <template v-if="row.durationMin"> · {{ row.durationMin }} 分钟</template>
            <template v-if="row.code"> · {{ row.code }}</template>
          </div>
          <div v-if="row.description" class="muted meta-line desc">{{ row.description }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无服务项目" />
      </van-list>
    </div>

    <div v-if="selectMode" class="batch-bar">
      <div class="batch-bar__info">已选 {{ selectedIds.size }}</div>
      <van-button
        size="small"
        type="primary"
        round
        :disabled="selectedIds.size < 1"
        :loading="previewing"
        @click="genPriceList"
      >
        生成价目表
      </van-button>
    </div>

    <van-popup v-model:show="showCreate" position="bottom" round :style="{ maxHeight: '85%' }">
      <div class="form-sheet">
        <div class="form-title">新增服务</div>
        <van-field v-model="form.name" label="名称" placeholder="必填" required />
        <van-field v-model="form.code" label="编码" placeholder="可选" />
        <van-field v-model="form.price" type="number" label="价格" placeholder="0.00" required />
        <van-field v-model="form.durationMin" type="digit" label="时长(分)" placeholder="可选" />
        <van-field v-model="form.description" rows="2" autosize type="textarea" label="说明" placeholder="可选" />
        <van-field
          is-link
          readonly
          label="分类"
          :model-value="categoryLabel"
          placeholder="选择分类"
          @click="showCatPicker = true"
        />
        <van-button block type="primary" round :loading="saving" class="form-submit" @click="saveCreate">
          保存
        </van-button>
      </div>
    </van-popup>

    <van-action-sheet
      v-model:show="showCatPicker"
      title="选择分类"
      :actions="categoryActions"
      @select="onPickCategory"
    />

    <van-action-sheet v-model:show="showStorePicker" title="选择门店（价目表）" :actions="storeActions" @select="onPickStore" />

    <van-popup v-model:show="showPriceList" position="bottom" round :style="{ height: '88%' }">
      <div class="receipt-sheet">
        <div class="form-title">价目表 · {{ priceListStoreName }}</div>
        <div class="paper-scroll">
          <div ref="pricePaperRef" class="paper" v-html="priceListHtml" />
        </div>
        <div class="sheet-actions">
          <van-button round plain hairline :loading="exporting" @click="copyPriceList">复制图片</van-button>
          <van-button round plain hairline type="primary" :loading="exporting" @click="downloadPriceList">
            下载
          </van-button>
          <van-button round type="primary" @click="showPriceList = false">关闭</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { storeApi, type ServiceCategory, type ServiceItem, type Store } from '../../api/store'
import { copyCanvasPng, downloadCanvasPng, renderElementToCanvas } from '../../utils/htmlToImage'

const router = useRouter()
const keyword = ref('')
const categoryId = ref(0)
const categories = ref<ServiceCategory[]>([])
const list = ref<ServiceItem[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const selectMode = ref(false)
const selectedIds = ref<Set<number>>(new Set())
const showCreate = ref(false)
const showCatPicker = ref(false)
const showStorePicker = ref(false)
const showPriceList = ref(false)
const saving = ref(false)
const previewing = ref(false)
const exporting = ref(false)
const stores = ref<Store[]>([])
const storeId = ref(0)
const formCategoryId = ref(0)
const priceListHtml = ref('')
const priceListStoreName = ref('')
const pricePaperRef = ref<HTMLElement>()

const form = reactive({
  name: '',
  code: '',
  price: '',
  durationMin: '',
  description: '',
})

function flattenCats(nodes: ServiceCategory[], depth = 0): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = []
  for (const n of nodes) {
    out.push({ id: n.id, name: `${'·'.repeat(depth)}${depth ? ' ' : ''}${n.name}` })
    if (n.children?.length) out.push(...flattenCats(n.children, depth + 1))
  }
  return out
}

const flatCategories = computed(() => flattenCats(categories.value))
const categoryActions = computed(() =>
  flatCategories.value.map((c) => ({ name: c.name, categoryId: c.id })),
)
const categoryLabel = computed(
  () => flatCategories.value.find((c) => c.id === formCategoryId.value)?.name || '',
)
const storeActions = computed(() =>
  stores.value.map((s) => ({ name: s.name, subname: s.code, storeId: s.id })),
)

function setCategory(id: number) {
  categoryId.value = id
  reload()
}

function toggleSelectMode() {
  selectMode.value = !selectMode.value
  if (!selectMode.value) selectedIds.value = new Set()
}

function toggleSelect(id: number, on: boolean) {
  const next = new Set(selectedIds.value)
  if (on) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

function onCardClick(row: ServiceItem) {
  if (selectMode.value) {
    toggleSelect(row.id, !selectedIds.value.has(row.id))
  }
}

function openCreate() {
  form.name = ''
  form.code = ''
  form.price = ''
  form.durationMin = ''
  form.description = ''
  formCategoryId.value = categoryId.value || flatCategories.value[0]?.id || 0
  showCreate.value = true
}

function onPickCategory(action: { categoryId?: number }) {
  if (action.categoryId) formCategoryId.value = action.categoryId
  showCatPicker.value = false
}

async function saveCreate() {
  const name = form.name.trim()
  if (!name) {
    showFailToast('请填写名称')
    return
  }
  if (!formCategoryId.value) {
    showFailToast('请选择分类')
    return
  }
  const price = Number(form.price)
  if (!Number.isFinite(price) || price < 0) {
    showFailToast('请填写有效价格')
    return
  }
  saving.value = true
  try {
    await storeApi.createServiceItem({
      categoryId: formCategoryId.value,
      name,
      code: form.code.trim() || undefined,
      price,
      durationMin: form.durationMin ? Number(form.durationMin) : undefined,
      description: form.description.trim() || undefined,
      status: 1,
      sort: 0,
    })
    showSuccessToast('已新增')
    showCreate.value = false
    reload()
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function genPriceList() {
  if (!storeId.value) {
    showStorePicker.value = true
    return
  }
  previewing.value = true
  try {
    const res = await storeApi.previewServicePriceList({
      storeId: storeId.value,
      serviceItemIds: [...selectedIds.value],
      groupByCategory: true,
    })
    priceListHtml.value = res.html
    priceListStoreName.value = res.storeName || ''
    showPriceList.value = true
  } catch (e: any) {
    showFailToast(e.message || '生成失败')
  } finally {
    previewing.value = false
  }
}

function onPickStore(action: { storeId?: number }) {
  if (action.storeId) storeId.value = action.storeId
  showStorePicker.value = false
  void genPriceList()
}

async function withPriceCanvas(action: (canvas: HTMLCanvasElement) => Promise<void>) {
  if (exporting.value) return
  const el = pricePaperRef.value
  if (!el) {
    showFailToast('暂无价目表内容')
    return
  }
  exporting.value = true
  try {
    const canvas = await renderElementToCanvas(el, { widthPx: 360, scale: 2.5 })
    await action(canvas)
  } catch (e: any) {
    showFailToast(e.message || '操作失败')
  } finally {
    exporting.value = false
  }
}

async function downloadPriceList() {
  await withPriceCanvas(async (canvas) => {
    const name = (priceListStoreName.value || '价目表').replace(/[\\/:*?"<>|]/g, '_')
    downloadCanvasPng(canvas, `price-list-${name}-${Date.now()}.png`)
    showSuccessToast('已下载')
  })
}

async function copyPriceList() {
  await withPriceCanvas(async (canvas) => {
    await copyCanvasPng(canvas)
    showSuccessToast('图片已复制')
  })
}

async function loadMore() {
  loading.value = true
  try {
    const res = await storeApi.listServiceItems({
      keyword: keyword.value.trim() || undefined,
      categoryId: categoryId.value || undefined,
      status: 1,
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

onMounted(async () => {
  try {
    categories.value = (await storeApi.listServiceCategoryTree()) || []
  } catch {
    /* ignore */
  }
  try {
    const res = await storeApi.listStores('', 1, 50)
    stores.value = (res.list || []).filter((s) => s.status !== 0)
    if (stores.value[0]) storeId.value = stores.value[0].id
  } catch {
    /* ignore */
  }
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
  color: #0369a1;
  border-color: rgba(14, 165, 233, 0.4);
  background: rgba(14, 165, 233, 0.1);
}
.hint-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 8px;
  font-size: 12px;
}
.order-card--selected {
  border-color: rgba(14, 165, 233, 0.45);
  box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.2);
}
.order-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.order-card__left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.meta-line {
  font-size: 12px;
  margin-top: 4px;
}
.desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.amt {
  font-weight: 700;
  flex-shrink: 0;
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
  font-size: 12px;
  color: var(--ops-muted);
  margin-right: auto;
}
.form-sheet,
.receipt-sheet {
  padding: 16px 16px calc(16px + var(--ops-safe-bottom));
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.form-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.form-submit {
  margin-top: 12px;
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
  padding: 10px;
  box-shadow: 0 4px 16px rgba(15, 31, 42, 0.08);
  font-size: 12px;
  line-height: 1.4;
  overflow: hidden;
}
.paper :deep(img) {
  max-width: 100%;
  height: auto;
}
.paper :deep(table) {
  width: 100% !important;
  max-width: 100% !important;
  font-size: 11px !important;
}
.paper :deep(h1),
.paper :deep(h2),
.paper :deep(h3) {
  font-size: 15px !important;
  margin: 6px 0 !important;
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
