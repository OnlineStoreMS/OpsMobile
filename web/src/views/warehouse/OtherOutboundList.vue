<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="其它出库单" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openCreate">新建</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          @click="router.push(`/warehouse/other-outbounds/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.docNo || row.doc_no || `#${row.id}` }}</div>
            <span class="ops-tag" :class="row.status === 'posted' ? 'ops-tag--ok' : 'ops-tag--warn'">
              {{ DOC_STATUS_MAP[row.status] || row.status }}
            </span>
          </div>
          <div class="muted">{{ row.warehouseName || row.warehouse_name || '' }} · {{ row.reason || '' }}</div>
          <div class="muted">{{ row.createdAt || row.created_at }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无出库单" />
      </van-list>
    </div>

    <van-popup v-model:show="showCreate" position="bottom" round teleport="body" class="sheet-popup" style="height: 85%">
      <div class="sheet create-doc">
        <div class="sheet-title">新建其它出库</div>
        <van-field
          :model-value="whName(form.warehouseId)"
          is-link
          readonly
          label="仓库"
          required
          @click="showWh = true"
        />
        <van-field v-model="form.reason" label="原因" />
        <van-field v-model="form.remark" label="备注" />
        <div class="section-label">
          明细
          <button type="button" class="link-btn" @click="addLine">+ 行</button>
        </div>
        <div v-for="(it, idx) in form.items" :key="idx" class="card">
          <van-field v-model="it.skuKw" label="SKU" placeholder="输入编码后点搜索" />
          <van-button size="mini" @click="resolveSku(it)">搜索填充</van-button>
          <div class="muted" v-if="it.invSkuId">已选 #{{ it.invSkuId }} {{ it.skuCode }}</div>
          <van-field v-model="it.qty" type="number" label="数量" />
          <van-button v-if="form.items.length > 1" size="mini" plain type="danger" @click="form.items.splice(idx, 1)">
            删除
          </van-button>
        </div>
        <div class="pay-sheet-actions">
          <van-button block round @click="showCreate = false">取消</van-button>
          <van-button type="primary" block round :loading="creating" @click="create">创建</van-button>
        </div>
      </div>
    </van-popup>
    <van-action-sheet
      v-model:show="showWh"
      :actions="whActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="(a: any) => (form.warehouseId = a.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { DOC_STATUS_MAP, whApi } from '../../api/warehouse'

const router = useRouter()
const list = ref<any[]>([])
const warehouses = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const showCreate = ref(false)
const showWh = ref(false)
const creating = ref(false)

const form = reactive<any>({
  warehouseId: 0,
  reason: '',
  remark: '',
  items: [emptyItem()],
})

function emptyItem() {
  return { invSkuId: 0, skuCode: '', skuKw: '', qty: '1' }
}
const whActions = computed(() => warehouses.value.map((w) => ({ name: w.name, id: w.id })))
function whName(id: number) {
  return warehouses.value.find((w) => w.id === id)?.name || (id ? `#${id}` : '请选择')
}
function addLine() {
  form.items.push(emptyItem())
}
function openCreate() {
  form.warehouseId = warehouses.value[0]?.id || 0
  form.reason = ''
  form.remark = ''
  form.items = [emptyItem()]
  showCreate.value = true
}

async function resolveSku(it: any) {
  const res = await whApi.listSkus({ keyword: it.skuKw.trim(), page: 1, pageSize: 5 })
  const s = (res.list || [])[0]
  if (!s) {
    showFailToast('未找到 SKU')
    return
  }
  it.invSkuId = s.id
  it.skuCode = s.skuCode || s.sku_code
  showSuccessToast(`已选 ${it.skuCode}`)
}

async function create() {
  const items = form.items.filter((i: any) => i.invSkuId && Number(i.qty) > 0)
  if (!form.warehouseId || !items.length) {
    showFailToast('请选择仓库并添加有效明细')
    return
  }
  creating.value = true
  try {
    const row = await whApi.createOtherOut({
      warehouseId: form.warehouseId,
      reason: form.reason,
      remark: form.remark,
      items: items.map((i: any) => ({
        invSkuId: i.invSkuId,
        qty: Number(i.qty),
      })),
    })
    showSuccessToast('已创建')
    showCreate.value = false
    router.push(`/warehouse/other-outbounds/${row.id}`)
  } catch (e: any) {
    showFailToast(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listOtherOut({ page: page.value, pageSize: 20 })
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

onMounted(async () => {
  try {
    warehouses.value = (await whApi.listWarehouses({ page: 1, pageSize: 50 })).list || []
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.nav-link {
  color: var(--ops-primary);
  font-weight: 600;
}
.link-btn {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-weight: 650;
}
.create-doc {
  max-height: 100%;
  overflow: auto;
}
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 4px;
}
</style>
