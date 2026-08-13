<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="条码打印" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/printers')">打印机</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="搜索库存SKU" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card sku-pick"
          :class="{ active: selected.has(row.id) }"
          @click="toggle(row)"
        >
          <van-checkbox :model-value="selected.has(row.id)" @click.stop="toggle(row)" />
          <div class="sku-pick__body">
            <div class="order-card__no">{{ row.skuCode || row.sku_code }}</div>
            <div class="muted">{{ row.pickName || row.pick_name || row.productName || '' }}</div>
          </div>
        </div>
      </van-list>
    </div>

    <div class="footer-safe" v-if="selected.size">
      <van-button type="primary" block round @click="previewPrint">打印预览（{{ selected.size }}）</van-button>
    </div>

    <van-popup v-model:show="showPreview" position="bottom" round teleport="body" class="sheet-popup" style="height: 80%">
      <div class="sheet print-sheet">
        <div class="sheet-title">标签预览</div>
        <div class="printer-hint muted" @click="() => openPrinterPicker(false)">
          <van-icon name="printer" />
          <span>{{ printerHint }}</span>
          <span class="nav-link">更换</span>
        </div>
        <div class="label-list">
          <div v-for="s in selectedRows" :key="s.id" class="label-card">
            <canvas :ref="(el) => setCanvas(s.id, el as HTMLCanvasElement)" class="label-canvas" />
            <div class="label-code">{{ s.skuCode || s.sku_code }}</div>
            <div class="label-name">{{ s.pickName || s.pick_name || '' }}</div>
          </div>
        </div>
        <div class="pay-sheet-actions">
          <van-button block round @click="showPreview = false">关闭</van-button>
          <van-button type="primary" block round :loading="printing" @click="onPrintClick">打印</van-button>
        </div>
      </div>
    </van-popup>

    <van-action-sheet
      v-model:show="showPrinterSheet"
      :actions="printerActions"
      cancel-text="取消"
      description="选择条码打印机（可与面单机不同）"
      teleport="body"
      @select="onPrinterSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, type ActionSheetAction } from 'vant'
import { whApi } from '../../api/warehouse'
import {
  getSavedBarcodePrinterIndex,
  getSavedBarcodePrinterName,
  listLocalPrinters,
  printBarcodeLabelsWithLodop,
  saveBarcodePrinterSelection,
  type LocalPrinter,
} from '../../utils/sfPrintPlugin'

const router = useRouter()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const selected = ref(new Map<number, any>())
const showPreview = ref(false)
const canvasMap = new Map<number, HTMLCanvasElement>()

const printing = ref(false)
const showPrinterSheet = ref(false)
const printers = ref<LocalPrinter[]>([])
const pickPrinterIndex = ref<number | null>(getSavedBarcodePrinterIndex())
const pickPrinterName = ref(getSavedBarcodePrinterName())
/** 选完打印机后是否立刻打印 */
const printAfterPick = ref(false)

const selectedRows = computed(() => [...selected.value.values()])

const printerHint = computed(() => {
  if (pickPrinterIndex.value == null) return '尚未选择条码打印机，点此选择'
  return pickPrinterName.value
    ? `打印机：${pickPrinterName.value}`
    : `打印机索引 ${pickPrinterIndex.value}`
})

const printerActions = computed<ActionSheetAction[]>(() => {
  const actions: ActionSheetAction[] = printers.value.map((p) => ({
    name: p.name,
    subname: `索引 ${p.index}${pickPrinterIndex.value === p.index ? ' · 当前' : ''}`,
    index: p.index,
  }))
  actions.push({ name: '去打印机管理…', subname: '配置 C-Lodop / 探测', color: '#0f766e' })
  return actions
})

function toggle(row: any) {
  const m = new Map(selected.value)
  if (m.has(row.id)) m.delete(row.id)
  else m.set(row.id, row)
  selected.value = m
}

function setCanvas(id: number, el: HTMLCanvasElement | null) {
  if (el) canvasMap.set(id, el)
}

/** 预览用简化条纹；正式打印走 C-Lodop Code128 */
function drawBarcode(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = 280
  const h = 80
  canvas.width = w
  canvas.height = h
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#000'
  let x = 12
  const text = code || '0'
  for (let i = 0; i < text.length; i++) {
    const n = text.charCodeAt(i) % 10
    const barW = 1 + (n % 3)
    if (n % 2 === 0) ctx.fillRect(x, 8, barW, 52)
    x += barW + 1
    if (x > w - 12) break
  }
}

async function previewPrint() {
  if (!selected.value.size) return
  pickPrinterIndex.value = getSavedBarcodePrinterIndex()
  pickPrinterName.value = getSavedBarcodePrinterName()
  showPreview.value = true
  await nextTick()
  redrawCanvases()
}

function redrawCanvases() {
  for (const row of selectedRows.value) {
    const c = canvasMap.get(row.id)
    if (c) drawBarcode(c, row.skuCode || row.sku_code || '')
  }
}

async function loadPrinters() {
  try {
    printers.value = await listLocalPrinters()
  } catch (e: any) {
    printers.value = []
    showFailToast(e?.message || '无法连接 C-Lodop，请先在打印机管理配置')
    throw e
  }
}

async function openPrinterPicker(thenPrint = false) {
  printAfterPick.value = thenPrint
  try {
    await loadPrinters()
  } catch {
    await router.push('/printers')
    return
  }
  if (!printers.value.length) {
    showFailToast('未检测到打印机，请先在打印机管理探测')
    await router.push('/printers')
    return
  }
  showPrinterSheet.value = true
}

async function onPrintClick() {
  if (!selected.value.size) return
  // 每次打印都可换机：有缓存则直接再确认选一次，或已选则开选择再打
  await openPrinterPicker(true)
}

async function onPrinterSelect(action: ActionSheetAction) {
  if (action.name === '去打印机管理…') {
    showPrinterSheet.value = false
    await router.push('/printers')
    return
  }
  const idx = (action as ActionSheetAction & { index?: number }).index
  if (idx == null || !Number.isFinite(idx)) return
  const p = printers.value.find((x) => x.index === idx)
  pickPrinterIndex.value = idx
  pickPrinterName.value = p?.name || action.name || `打印机 ${idx}`
  saveBarcodePrinterSelection(idx, pickPrinterName.value)
  showPrinterSheet.value = false

  if (printAfterPick.value) {
    printAfterPick.value = false
    await doLodopPrint(idx)
  }
}

async function doLodopPrint(printerIndex: number) {
  printing.value = true
  try {
    const labels = selectedRows.value.map((r) => ({
      code: String(r.skuCode || r.sku_code || '').trim(),
      name: String(r.pickName || r.pick_name || '').trim(),
    })).filter((x) => x.code)
    if (!labels.length) {
      showFailToast('没有有效 SKU 编码')
      return
    }
    await printBarcodeLabelsWithLodop(labels, { printerIndex })
    showSuccessToast(`已发送 ${labels.length} 张标签`)
    showPreview.value = false
  } catch (e: any) {
    const msg = String(e?.message || e || '')
    if (/CLODOP|C-Lodop|打印服务|加载失败|WebSocket/i.test(msg) || msg.includes('ensureLocal')) {
      showFailToast('C-Lodop 未连通，请先配置打印机')
      await router.push('/printers')
    } else {
      showFailToast(msg || '打印失败')
    }
  } finally {
    printing.value = false
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listSkus({
      keyword: keyword.value.trim() || undefined,
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

watch(showPreview, async (v) => {
  if (!v) return
  await nextTick()
  redrawCanvases()
})
</script>

<style scoped>
.sku-pick {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sku-pick.active {
  outline: 2px solid var(--ops-primary-soft);
}
.sku-pick__body {
  flex: 1;
  min-width: 0;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 14px calc(12px + var(--ops-safe-bottom));
  background: #e8eef2;
}
.print-sheet {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.printer-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px 8px;
  font-size: 12px;
}
.printer-hint .nav-link {
  margin-left: auto;
}
.label-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}
.label-card {
  background: #fff;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  text-align: center;
}
.label-canvas {
  max-width: 100%;
}
.label-code {
  font-family: var(--ops-display);
  font-weight: 700;
  margin-top: 6px;
}
.label-name {
  font-size: 12px;
  color: #666;
}
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px;
}
</style>
