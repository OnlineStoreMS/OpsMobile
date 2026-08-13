<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="盘点单详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.docNo || detail.doc_no || `#${detail.id}` }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag">{{ DOC_STATUS_MAP[detail.status] || detail.status }}</span>
        </div>
        <div class="muted" style="margin-top: 8px; color: rgba(255,255,255,.75)">
          {{ detail.warehouseName || detail.warehouse_name }} · {{ detail.checkerName || detail.checker_name || '-' }}
        </div>
      </div>

      <div class="section-label">
        盘点明细
        <button v-if="editable" type="button" class="link-btn" @click="showAdd = true">+ 加商品</button>
      </div>
      <div v-for="it in items" :key="it.id || it.invSkuId" class="card">
        <div class="order-card__no">{{ it.skuCode || it.sku_code || it.invSkuId }}</div>
        <div class="muted">{{ it.pickName || it.pick_name || '' }}</div>
        <div class="count-row">
          <span>账存 {{ Number(it.bookQty ?? it.book_qty ?? 0) }}</span>
          <van-field
            v-if="editable"
            v-model="it._count"
            type="digit"
            label="实盘"
            input-align="right"
            style="flex: 1"
          />
          <span v-else>实盘 {{ Number(it.countQty ?? it.count_qty ?? 0) }}</span>
        </div>
        <div class="muted">差异 {{ diff(it) }}</div>
      </div>
      <van-empty v-if="!items.length" description="请添加盘点商品" />

      <div class="footer-safe" v-if="editable">
        <van-button block round :loading="saving" @click="save(false)">保存</van-button>
        <van-button type="primary" block round :loading="saving" @click="save(true)">保存并过账</van-button>
      </div>
    </div>

    <van-popup v-model:show="showAdd" position="bottom" round teleport="body" class="sheet-popup" style="height: 70%">
      <div class="sheet">
        <div class="sheet-title">添加盘点商品</div>
        <van-search v-model="skuKw" shape="round" placeholder="搜索 SKU" @search="searchSku" />
        <div v-for="s in skuHits" :key="s.id" class="order-card" @click="addSku(s)">
          <div class="order-card__no">{{ s.skuCode || s.sku_code }}</div>
          <div class="muted">{{ s.pickName || s.pick_name || '' }}</div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { DOC_STATUS_MAP, whApi } from '../../api/warehouse'

const route = useRoute()
const router = useRouter()
const detail = ref<any>(null)
const items = ref<any[]>([])
const saving = ref(false)
const showAdd = ref(false)
const skuKw = ref('')
const skuHits = ref<any[]>([])

const editable = computed(() => ['draft', 'counting'].includes(detail.value?.status))

function diff(it: any) {
  const book = Number(it.bookQty ?? it.book_qty ?? 0)
  const count = editable.value ? Number(it._count || 0) : Number(it.countQty ?? it.count_qty ?? 0)
  return count - book
}

async function load() {
  const id = Number(route.params.id)
  detail.value = await whApi.getStocktake(id)
  items.value = (detail.value.items || []).map((it: any) => ({
    ...it,
    _count: String(Math.round(Number(it.countQty ?? it.count_qty ?? it.bookQty ?? it.book_qty ?? 0))),
  }))
}

async function searchSku() {
  const res = await whApi.listSkus({ keyword: skuKw.value.trim(), page: 1, pageSize: 20 })
  skuHits.value = res.list || []
}

async function addSku(s: any) {
  if (!detail.value?.id) return
  try {
    // 带出账面
    let book = 0
    try {
      const bal = await whApi.stockBalances({
        warehouseId: detail.value.warehouseId || detail.value.warehouse_id,
        skuCode: s.skuCode || s.sku_code,
        page: 1,
        pageSize: 5,
      })
      book = Number((bal.list || [])[0]?.onHand ?? (bal.list || [])[0]?.on_hand ?? 0)
    } catch {
      /* ignore */
    }
    await whApi.addStocktakeItems(detail.value.id, {
      items: [{ invSkuId: s.id, countQty: book, remark: '' }],
    })
    showAdd.value = false
    await load()
    showSuccessToast('已添加')
  } catch (e: any) {
    showFailToast(e.message || '添加失败')
  }
}

async function save(andPost: boolean) {
  if (!detail.value?.id) return
  if (!items.value.length) {
    showFailToast('请先添加盘点商品')
    return
  }
  saving.value = true
  try {
    await whApi.updateStocktake(detail.value.id, {
      checkerName: detail.value.checkerName || detail.value.checker_name || '',
      remark: detail.value.remark || '',
    })
    await whApi.saveStocktakeCounts(detail.value.id, {
      items: items.value
        .filter((it) => it.id)
        .map((it) => ({
          id: it.id,
          countQty: Math.round(Number(it._count) || 0),
          remark: it.remark || '',
        })),
    })
    if (andPost) {
      await showConfirmDialog({ title: '确认过账', message: '将按盘点差异调整库存' })
      await whApi.postStocktake(detail.value.id)
      showSuccessToast('已过账')
    } else {
      showSuccessToast('已保存')
    }
    await load()
  } catch (e: any) {
    if (e !== 'cancel') showFailToast(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  }
})
</script>

<style scoped>
.detail-hero {
  background: linear-gradient(155deg, #0b1f2a, #163447);
  color: #fff;
  border: none;
}
.detail-hero__no {
  font-family: var(--ops-display);
  font-weight: 700;
  font-size: 18px;
}
.detail-hero__tags {
  margin-top: 10px;
}
.link-btn {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-weight: 650;
}
.count-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, #e8eef2 28%);
}
</style>
