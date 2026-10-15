<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="分类管理" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openCreate(0)">新建</span>
      </template>
    </van-nav-bar>
    <div class="page-body">
      <van-loading v-if="loading" vertical>加载中…</van-loading>
      <template v-else>
        <div
          v-for="node in flat"
          :key="node.id"
          class="order-card cat-row"
          @click="openActions(node)"
        >
          <div class="cat-main" :style="{ paddingLeft: `${node.depth * 14}px` }">
            <div class="cat-name">
              {{ node.name }}
              <van-tag v-if="node.code === 'uncategorized'" plain type="primary" size="medium">
                系统
              </van-tag>
            </div>
            <div class="muted cat-sub">
              {{ node.enabled === 0 ? '已停用 · ' : '' }}点按管理，或进素材库
            </div>
          </div>
          <van-icon name="ellipsis" color="#9aabB6" />
        </div>
        <van-empty v-if="!flat.length" description="暂无分类">
          <van-button type="primary" size="small" round @click="openCreate(0)">新建根分类</van-button>
        </van-empty>
      </template>
    </div>

    <van-action-sheet
      v-model:show="showActions"
      :actions="actionItems"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onAction"
    />

    <van-popup
      v-model:show="showForm"
      position="bottom"
      round
      teleport="body"
      class="sheet-popup"
      safe-area-inset-bottom
    >
      <div class="sheet">
        <div class="sheet-title">{{ formMode === 'create' ? '新建分类' : '编辑分类' }}</div>
        <van-field v-model="form.name" label="名称" required maxlength="64" placeholder="分类名称" />
        <van-field v-model="form.sortText" type="digit" label="排序" placeholder="数字越小越靠前" />
        <van-cell title="启用">
          <template #right-icon>
            <van-switch v-model="form.enabledOn" size="20px" />
          </template>
        </van-cell>
        <p v-if="form.parentId" class="sheet-hint">将作为「{{ parentName }}」的子分类</p>
        <div class="pay-sheet-actions">
          <van-button block round :disabled="saving" @click="showForm = false">取消</van-button>
          <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { materialApi } from '../../api/material'

type FlatCat = {
  id: number
  parentId: number
  name: string
  code: string
  sort: number
  enabled: number
  depth: number
}

const router = useRouter()
const loading = ref(true)
const saving = ref(false)
const flat = ref<FlatCat[]>([])
const showActions = ref(false)
const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const active = ref<FlatCat | null>(null)

const form = reactive({
  id: 0,
  parentId: 0,
  name: '',
  sortText: '0',
  enabledOn: true,
})

const parentName = computed(() => {
  const p = flat.value.find((x) => x.id === form.parentId)
  return p?.name || ''
})

const actionItems = computed(() => {
  const node = active.value
  if (!node) return []
  const items: { name: string; value: string; color?: string }[] = [
    { name: '查看素材', value: 'view' },
    { name: '新建子分类', value: 'child' },
    { name: '编辑', value: 'edit' },
  ]
  if (node.code !== 'uncategorized') {
    items.push({ name: '删除', value: 'delete', color: '#ee0a24' })
  }
  return items
})

function walk(nodes: any[], depth: number, out: FlatCat[]) {
  for (const n of nodes || []) {
    out.push({
      id: n.id,
      parentId: n.parentId ?? 0,
      name: n.name,
      code: n.code || '',
      sort: n.sort ?? 0,
      enabled: n.enabled ?? 1,
      depth,
    })
    if (n.children?.length) walk(n.children, depth + 1, out)
  }
}

async function load() {
  loading.value = true
  try {
    const tree = await materialApi.listCategories()
    const out: FlatCat[] = []
    walk(Array.isArray(tree) ? tree : [], 0, out)
    flat.value = out
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openActions(node: FlatCat) {
  active.value = node
  showActions.value = true
}

function openCreate(parentId: number) {
  formMode.value = 'create'
  form.id = 0
  form.parentId = parentId
  form.name = ''
  form.sortText = '0'
  form.enabledOn = true
  showForm.value = true
}

function openEdit(node: FlatCat) {
  formMode.value = 'edit'
  form.id = node.id
  form.parentId = node.parentId
  form.name = node.name
  form.sortText = String(node.sort ?? 0)
  form.enabledOn = node.enabled !== 0
  showForm.value = true
}

async function onAction(act: { value?: string }) {
  const node = active.value
  if (!node || !act.value) return
  if (act.value === 'view') {
    router.push({ path: '/material/materials', query: { categoryId: String(node.id) } })
    return
  }
  if (act.value === 'child') {
    openCreate(node.id)
    return
  }
  if (act.value === 'edit') {
    openEdit(node)
    return
  }
  if (act.value === 'delete') {
    if (node.code === 'uncategorized') {
      showFailToast('系统分类「未分类」不可删除')
      return
    }
    try {
      await showConfirmDialog({
        title: '删除分类',
        message: `确定删除「${node.name}」？若有子分类或素材将无法删除。`,
      })
      await materialApi.deleteCategory(node.id)
      showSuccessToast('已删除')
      await load()
    } catch (e: any) {
      if (e === 'cancel' || e?.message === 'cancel') return
      showFailToast(e.message || '删除失败')
    }
  }
}

async function save() {
  if (!form.name.trim()) {
    showFailToast('请输入分类名称')
    return
  }
  const sort = Number(form.sortText || 0)
  saving.value = true
  try {
    if (formMode.value === 'create') {
      await materialApi.createCategory({
        parentId: form.parentId,
        name: form.name.trim(),
        sort: Number.isFinite(sort) ? sort : 0,
        enabled: form.enabledOn ? 1 : 0,
      })
      showSuccessToast('已创建')
    } else {
      await materialApi.updateCategory(form.id, {
        parentId: form.parentId,
        name: form.name.trim(),
        sort: Number.isFinite(sort) ? sort : 0,
        enabled: form.enabledOn ? 1 : 0,
      })
      showSuccessToast('已保存')
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    showFailToast(e.message || '操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.cat-main {
  min-width: 0;
  flex: 1;
}
.cat-name {
  font-weight: 650;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.cat-sub {
  margin-top: 2px;
  font-size: 12px;
}
.sheet-hint {
  margin: 0 16px 8px;
  font-size: 12px;
  color: var(--ops-muted);
}
</style>
