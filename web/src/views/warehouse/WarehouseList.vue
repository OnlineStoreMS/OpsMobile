<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="仓库设置" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openForm()">新建</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.id" class="order-card" @click="openForm(row)">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.name }}</div>
            <span class="ops-tag" v-if="row.isDefault || row.is_default">默认</span>
          </div>
          <div class="muted">编码 {{ row.code }} · {{ row.type || '普通仓' }}</div>
          <div class="muted" v-if="row.address">{{ row.address }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无仓库" />
      </van-list>
    </div>

    <van-popup v-model:show="show" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">{{ form.id ? '编辑仓库' : '新建仓库' }}</div>
        <van-field v-model="form.code" label="编码" required :disabled="!!form.id" />
        <van-field v-model="form.name" label="名称" required />
        <van-field v-model="form.type" label="类型" placeholder="如 normal" />
        <van-field v-model="form.address" label="地址" />
        <van-field v-model="form.contact" label="联系人" />
        <van-field v-model="form.phone" label="电话" />
        <van-field v-model="form.remark" label="备注" />
        <van-cell title="设为默认仓">
          <template #right-icon>
            <van-switch v-model="form.isDefaultOn" size="20px" />
          </template>
        </van-cell>
        <div class="pay-sheet-actions">
          <van-button block round :disabled="saving" @click="show = false">取消</van-button>
          <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { whApi } from '../../api/warehouse'

const router = useRouter()
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const show = ref(false)
const saving = ref(false)
const form = reactive<any>({
  id: 0,
  code: '',
  name: '',
  type: 'normal',
  address: '',
  contact: '',
  phone: '',
  remark: '',
  isDefaultOn: false,
  status: 1,
})

function openForm(row?: any) {
  Object.assign(form, {
    id: row?.id || 0,
    code: row?.code || '',
    name: row?.name || '',
    type: row?.type || 'normal',
    address: row?.address || '',
    contact: row?.contact || '',
    phone: row?.phone || '',
    remark: row?.remark || '',
    isDefaultOn: !!(row?.isDefault ?? row?.is_default),
    status: row?.status ?? 1,
  })
  show.value = true
}

async function save() {
  if (!form.code.trim() || !form.name.trim()) {
    showFailToast('请填写编码与名称')
    return
  }
  saving.value = true
  try {
    const body = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type || 'normal',
      address: form.address,
      contact: form.contact,
      phone: form.phone,
      remark: form.remark,
      status: form.status ?? 1,
      isDefault: form.isDefaultOn ? 1 : 0,
    }
    if (form.id) await whApi.updateWarehouse(form.id, body)
    else await whApi.createWarehouse(body)
    showSuccessToast('已保存')
    show.value = false
    page.value = 1
    finished.value = false
    list.value = []
    await loadMore()
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listWarehouses({ page: page.value, pageSize: 30 })
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
  padding: 12px 4px 4px;
}
</style>
