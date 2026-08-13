<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="库位管理" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openForm()">新建</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <div class="filter-bar">
        <button type="button" class="date-chip" :class="{ 'date-chip--on': !warehouseId }" @click="pickWh(0)">全部仓</button>
        <button
          v-for="w in warehouses"
          :key="w.id"
          type="button"
          class="date-chip"
          :class="{ 'date-chip--on': warehouseId === w.id }"
          @click="pickWh(w.id)"
        >
          {{ w.name }}
        </button>
      </div>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.id" class="order-card" @click="openDetail(row)">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.code }}</div>
            <van-icon name="arrow" color="#9aabB6" />
          </div>
          <div class="muted">{{ whName(row.warehouseId || row.warehouse_id) }}</div>
          <div class="muted" v-if="row.zone || row.aisle">
            {{ [row.zone, row.aisle, row.shelf, row.bin].filter(Boolean).join(' / ') }}
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无库位" />
      </van-list>
    </div>

    <van-popup v-model:show="show" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">{{ form.id ? '编辑库位' : '新建库位' }}</div>
        <van-field
          :model-value="whName(form.warehouseId)"
          is-link
          readonly
          label="仓库"
          required
          @click="showWhPick = true"
        />
        <van-field v-model="form.code" label="库位码" required />
        <van-field v-model="form.zone" label="库区" />
        <van-field v-model="form.aisle" label="巷道" />
        <van-field v-model="form.shelf" label="货架" />
        <van-field v-model="form.bin" label="储位" />
        <van-field v-model="form.remark" label="备注" />
        <div class="pay-sheet-actions">
          <van-button block round @click="show = false">取消</van-button>
          <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showDetail" position="bottom" round teleport="body" class="sheet-popup" style="height: 70%">
      <div class="sheet" v-if="current">
        <div class="sheet-title">库位 {{ current.code }}</div>
        <van-button size="small" type="primary" plain @click="openForm(current)">编辑库位</van-button>
        <div class="section-label" style="margin-top: 12px">已绑 SKU</div>
        <div v-for="s in locSkus" :key="s.id" class="order-card">
          <div class="order-card__no">{{ s.skuCode || s.sku_code || s.invSkuId }}</div>
          <van-button size="mini" type="danger" plain @click="unbind(s)">解绑</van-button>
        </div>
        <van-empty v-if="!locSkus.length" description="暂无绑定" />
        <van-field v-model="bindSkuKeyword" placeholder="搜索 SKU 绑定" @keyup.enter="bindSku" />
        <van-button block type="primary" round :loading="binding" @click="bindSku">绑定当前搜索命中第一条</van-button>
      </div>
    </van-popup>

    <van-action-sheet
      v-model:show="showWhPick"
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
import { whApi } from '../../api/warehouse'

const router = useRouter()
const warehouses = ref<any[]>([])
const warehouseId = ref(0)
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const show = ref(false)
const showDetail = ref(false)
const showWhPick = ref(false)
const saving = ref(false)
const binding = ref(false)
const current = ref<any>(null)
const locSkus = ref<any[]>([])
const bindSkuKeyword = ref('')
const form = reactive<any>({
  id: 0,
  warehouseId: 0,
  code: '',
  zone: '',
  aisle: '',
  shelf: '',
  bin: '',
  remark: '',
  status: 1,
})

const whActions = computed(() => warehouses.value.map((w) => ({ name: w.name, id: w.id })))

function whName(id: number) {
  return warehouses.value.find((w) => w.id === id)?.name || (id ? `#${id}` : '请选择')
}
function pickWh(id: number) {
  warehouseId.value = id
  reload()
}
function openForm(row?: any) {
  Object.assign(form, {
    id: row?.id || 0,
    warehouseId: row?.warehouseId || row?.warehouse_id || warehouseId.value || warehouses.value[0]?.id || 0,
    code: row?.code || '',
    zone: row?.zone || '',
    aisle: row?.aisle || '',
    shelf: row?.shelf || '',
    bin: row?.bin || '',
    remark: row?.remark || '',
    status: row?.status ?? 1,
  })
  showDetail.value = false
  show.value = true
}

async function openDetail(row: any) {
  current.value = row
  showDetail.value = true
  try {
    locSkus.value = (await whApi.listLocationSkus(row.id)) || []
  } catch (e: any) {
    locSkus.value = []
    showFailToast(e.message || '加载绑定失败')
  }
}

async function save() {
  if (!form.warehouseId || !form.code.trim()) {
    showFailToast('请选择仓库并填写库位码')
    return
  }
  saving.value = true
  try {
    const body = {
      warehouseId: form.warehouseId,
      code: form.code.trim(),
      zone: form.zone,
      aisle: form.aisle,
      shelf: form.shelf,
      bin: form.bin,
      remark: form.remark,
      status: form.status ?? 1,
    }
    if (form.id) await whApi.updateLocation(form.id, body)
    else await whApi.createLocation(body)
    showSuccessToast('已保存')
    show.value = false
    reload()
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function bindSku() {
  if (!current.value?.id || !bindSkuKeyword.value.trim()) {
    showFailToast('请输入 SKU')
    return
  }
  binding.value = true
  try {
    const res = await whApi.listSkus({ keyword: bindSkuKeyword.value.trim(), page: 1, pageSize: 5 })
    const sku = (res.list || [])[0]
    if (!sku) {
      showFailToast('未找到 SKU')
      return
    }
    await whApi.bindLocationSku(current.value.id, { invSkuId: sku.id })
    showSuccessToast('已绑定')
    locSkus.value = (await whApi.listLocationSkus(current.value.id)) || []
    bindSkuKeyword.value = ''
  } catch (e: any) {
    showFailToast(e.message || '绑定失败')
  } finally {
    binding.value = false
  }
}

async function unbind(s: any) {
  try {
    await whApi.unbindLocationSku(s.id)
    showSuccessToast('已解绑')
    locSkus.value = (await whApi.listLocationSkus(current.value.id)) || []
  } catch (e: any) {
    showFailToast(e.message || '解绑失败')
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listLocations({
      warehouseId: warehouseId.value || undefined,
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
.filter-bar {
  display: flex;
  gap: 8px;
  padding: 0 12px 8px;
  overflow-x: auto;
}
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 4px;
}
</style>
