<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="盘点单" left-arrow @click-left="router.back()">
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
          @click="router.push(`/warehouse/stocktakes/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.docNo || row.doc_no || `#${row.id}` }}</div>
            <span class="ops-tag" :class="statusClass(row.status)">{{ DOC_STATUS_MAP[row.status] || row.status }}</span>
          </div>
          <div class="muted">{{ row.warehouseName || row.warehouse_name || whName(row.warehouseId) }}</div>
          <div class="muted">{{ row.checkerName || row.checker_name || '' }} · {{ row.createdAt || row.created_at }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无盘点单" />
      </van-list>
    </div>

    <van-popup v-model:show="showCreate" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">新建盘点单</div>
        <van-field
          :model-value="whName(createForm.warehouseId)"
          is-link
          readonly
          label="仓库"
          required
          @click="showWh = true"
        />
        <van-field v-model="createForm.checkerName" label="盘点人" />
        <van-field v-model="createForm.remark" label="备注" />
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
      @select="(a: any) => (createForm.warehouseId = a.id)"
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
const createForm = reactive({ warehouseId: 0, checkerName: '', remark: '' })
const whActions = computed(() => warehouses.value.map((w) => ({ name: w.name, id: w.id })))

function whName(id: number) {
  return warehouses.value.find((w) => w.id === id)?.name || (id ? `#${id}` : '请选择')
}
function statusClass(s: string) {
  if (s === 'posted') return 'ops-tag--ok'
  if (s === 'cancelled') return ''
  return 'ops-tag--warn'
}
function openCreate() {
  createForm.warehouseId = warehouses.value[0]?.id || 0
  createForm.checkerName = ''
  createForm.remark = ''
  showCreate.value = true
}

async function create() {
  if (!createForm.warehouseId) {
    showFailToast('请选择仓库')
    return
  }
  creating.value = true
  try {
    const row = await whApi.createStocktake({
      warehouseId: createForm.warehouseId,
      checkerName: createForm.checkerName,
      remark: createForm.remark,
      fillAllBalances: false,
    })
    showSuccessToast('已创建')
    showCreate.value = false
    router.push(`/warehouse/stocktakes/${row.id}`)
  } catch (e: any) {
    showFailToast(e.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listStocktakes({ page: page.value, pageSize: 20 })
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
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 4px;
}
</style>
