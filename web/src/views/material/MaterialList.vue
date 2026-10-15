<template>
  <div class="page mat-page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="onBack">
      <template #right>
        <span class="nav-link" @click="goUpload">上传</span>
      </template>
    </van-nav-bar>

    <div class="list-shell mat-shell">
      <van-search v-model="keyword" shape="round" placeholder="标题 / 货号 / 标签" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div v-if="mediaType" class="type-bar">
        <van-tag plain type="primary" closeable @close="clearMediaType">
          {{ mediaType === 'video' ? '仅视频' : '仅图片' }}
        </van-tag>
      </div>

      <div class="browse">
        <aside class="cat-rail">
          <button
            type="button"
            class="cat-rail__item"
            :class="{ 'cat-rail__item--on': !selectedId }"
            @click="selectCategory(0)"
          >
            全部
          </button>
          <button
            v-for="c in rootCategories"
            :key="c.id"
            type="button"
            class="cat-rail__item"
            :class="{ 'cat-rail__item--on': isRailActive(c) }"
            @click="selectCategory(c.id)"
          >
            <span class="cat-rail__name">{{ c.name }}</span>
            <van-icon v-if="c.children?.length" name="arrow" class="cat-rail__arrow" />
          </button>
        </aside>

        <div class="mat-main">
          <div v-if="breadcrumb.length" class="crumb">
            <button type="button" class="crumb__link" @click="selectCategory(0)">全部</button>
            <template v-for="(b, i) in breadcrumb" :key="b.id">
              <van-icon name="arrow" class="crumb__sep" />
              <button
                type="button"
                class="crumb__link"
                :class="{ 'crumb__link--cur': i === breadcrumb.length - 1 }"
                @click="selectCategory(b.id)"
              >
                {{ b.name }}
              </button>
            </template>
          </div>

          <div v-if="submenu.length" class="submenu">
            <button
              type="button"
              class="submenu__chip"
              :class="{ 'submenu__chip--on': submenuAllActive }"
              @click="selectCategory(submenuParentId)"
            >
              全部
            </button>
            <button
              v-for="c in submenu"
              :key="c.id"
              type="button"
              class="submenu__chip"
              :class="{ 'submenu__chip--on': selectedId === c.id || isDescendantSelected(c) }"
              @click="selectCategory(c.id)"
            >
              {{ c.name }}
              <van-icon v-if="c.children?.length" name="arrow" class="submenu__more" />
            </button>
          </div>

          <van-list
            v-model:loading="loading"
            :finished="finished"
            finished-text="没有更多了"
            @load="loadMore"
          >
            <div class="mat-grid">
              <div
                v-for="row in list"
                :key="row.id"
                class="mat-card"
                @click="router.push(`/material/materials/${row.id}`)"
              >
                <div class="mat-thumb">
                  <img v-if="thumb(row)" :src="thumb(row)" alt="" />
                  <div v-else class="mat-thumb__empty">
                    {{ row.mediaType === 'video' ? '视频' : '无图' }}
                  </div>
                  <van-tag v-if="row.mediaType === 'video'" class="mat-badge" type="primary">视频</van-tag>
                </div>
                <div class="mat-title">{{ row.title || row.fileName || '未命名' }}</div>
                <div class="muted mat-meta">{{ row.productSn || '' }}</div>
              </div>
            </div>
            <van-empty v-if="!loading && !list.length" description="该分类暂无素材" />
          </van-list>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { materialApi, materialAssetUrl } from '../../api/material'

type CatNode = {
  id: number
  parentId?: number
  name: string
  children?: CatNode[]
}

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const tree = ref<CatNode[]>([])
const byId = ref<Map<number, CatNode>>(new Map())
const parentOf = ref<Map<number, number>>(new Map())

const mediaType = computed(() => {
  const v = route.query.mediaType
  return typeof v === 'string' && v ? v : ''
})

const selectedId = computed(() => {
  const v = route.query.categoryId
  if (typeof v !== 'string' || !v) return 0
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const rootCategories = computed(() => tree.value)

const selectedNode = computed(() => (selectedId.value ? byId.value.get(selectedId.value) : undefined))

const breadcrumb = computed(() => {
  if (!selectedId.value) return [] as CatNode[]
  const chain: CatNode[] = []
  let cur: number | undefined = selectedId.value
  const guard = new Set<number>()
  while (cur && !guard.has(cur)) {
    guard.add(cur)
    const node = byId.value.get(cur)
    if (!node) break
    chain.unshift(node)
    cur = parentOf.value.get(cur)
  }
  return chain
})

/** 当前应展示的子菜单：选中节点自身有子级 → 其子级；否则展示父级的子级 */
const submenuParentId = computed(() => {
  const node = selectedNode.value
  if (!node) return 0
  if (node.children?.length) return node.id
  return parentOf.value.get(node.id) || 0
})

const submenu = computed(() => {
  const pid = submenuParentId.value
  if (!pid) return [] as CatNode[]
  return byId.value.get(pid)?.children || []
})

const submenuAllActive = computed(() => {
  if (!submenu.value.length) return false
  return selectedId.value === submenuParentId.value
})

const navTitle = computed(() => {
  if (selectedNode.value) return selectedNode.value.name
  if (mediaType.value === 'image') return '图片素材'
  if (mediaType.value === 'video') return '视频素材'
  return '素材库'
})

function indexTree(nodes: CatNode[], parentId = 0) {
  for (const n of nodes || []) {
    byId.value.set(n.id, n)
    if (parentId) parentOf.value.set(n.id, parentId)
    if (n.children?.length) indexTree(n.children, n.id)
  }
}

function isRailActive(c: CatNode) {
  if (!selectedId.value) return false
  if (selectedId.value === c.id) return true
  return isUnder(c, selectedId.value)
}

function isUnder(root: CatNode, id: number): boolean {
  for (const ch of root.children || []) {
    if (ch.id === id || isUnder(ch, id)) return true
  }
  return false
}

function isDescendantSelected(c: CatNode) {
  if (!selectedId.value || selectedId.value === c.id) return false
  return isUnder(c, selectedId.value)
}

function selectCategory(id: number) {
  const query: Record<string, string> = {}
  if (mediaType.value) query.mediaType = mediaType.value
  if (id > 0) query.categoryId = String(id)
  router.replace({ path: '/material/materials', query })
}

function clearMediaType() {
  const query: Record<string, string> = {}
  if (selectedId.value) query.categoryId = String(selectedId.value)
  router.replace({ path: '/material/materials', query })
}

function goUpload() {
  router.push({
    path: '/material/upload',
    query: selectedId.value ? { categoryId: String(selectedId.value) } : {},
  })
}

function onBack() {
  if (selectedId.value) {
    const parent = parentOf.value.get(selectedId.value) || 0
    selectCategory(parent)
    return
  }
  router.back()
}

function thumb(row: any) {
  return materialAssetUrl(row.coverUrl || (row.mediaType === 'image' ? row.url : '') || '')
}

async function loadCategories() {
  try {
    const raw = await materialApi.listCategories()
    tree.value = Array.isArray(raw) ? raw : []
    byId.value = new Map()
    parentOf.value = new Map()
    indexTree(tree.value)
  } catch (e: any) {
    showFailToast(e.message || '分类加载失败')
  }
}

async function loadMore() {
  loading.value = true
  try {
    const res = await materialApi.listMaterials({
      keyword: keyword.value.trim() || undefined,
      mediaType: mediaType.value || undefined,
      categoryId: selectedId.value || undefined,
      includeChildren: selectedId.value ? true : undefined,
      page: page.value,
      pageSize: 24,
    })
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 24) finished.value = true
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

watch(
  () => [route.query.mediaType, route.query.categoryId],
  () => reload(),
)

onMounted(async () => {
  await loadCategories()
})
</script>

<style scoped>
.mat-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.mat-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.type-bar {
  padding: 0 12px 8px;
}
.browse {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}
.cat-rail {
  width: 92px;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.04);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 0 calc(12px + var(--ops-safe-bottom));
}
.cat-rail__item {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 12px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ops-muted);
  line-height: 1.35;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2px;
}
.cat-rail__item--on {
  background: var(--ops-card, #fff);
  color: #b45309;
  box-shadow: inset 3px 0 0 #f59e0b;
}
.cat-rail__name {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
.cat-rail__arrow {
  font-size: 10px;
  margin-top: 3px;
  opacity: 0.55;
  flex-shrink: 0;
}
.mat-main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 8px 10px calc(16px + var(--ops-safe-bottom));
  background: transparent;
}
.crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
  font-size: 12px;
}
.crumb__link {
  border: 0;
  background: transparent;
  color: #0369a1;
  padding: 0 2px;
  font-size: 12px;
  max-width: 7em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crumb__link--cur {
  color: var(--ops-text, #0f172a);
  font-weight: 650;
  pointer-events: none;
}
.crumb__sep {
  font-size: 10px;
  color: #94a3b8;
}
.submenu {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 10px;
  margin-bottom: 4px;
  scrollbar-width: none;
}
.submenu::-webkit-scrollbar {
  display: none;
}
.submenu__chip {
  flex-shrink: 0;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: var(--ops-card, #fff);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ops-muted);
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.submenu__chip--on {
  border-color: #f59e0b;
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
}
.submenu__more {
  font-size: 10px;
  opacity: 0.6;
}
.mat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 2px 0 12px;
}
.mat-card {
  background: var(--ops-card);
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: var(--ops-shadow-sm);
}
.mat-thumb {
  position: relative;
  aspect-ratio: 1;
  background: #e2e8f0;
}
.mat-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.mat-thumb__empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ops-muted);
  font-size: 13px;
}
.mat-badge {
  position: absolute;
  left: 6px;
  top: 6px;
}
.mat-title {
  font-size: 13px;
  font-weight: 650;
  padding: 8px 8px 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mat-meta {
  padding: 0 8px 10px;
  font-size: 11px;
  min-height: 16px;
}
</style>
