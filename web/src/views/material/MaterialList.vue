<template>
  <div class="page mat-page">
    <van-nav-bar class="ops-nav" title="素材库" left-arrow @click-left="onBack">
      <template #right>
        <span class="nav-link" @click="goUpload">上传</span>
      </template>
    </van-nav-bar>

    <div class="list-shell mat-shell">
      <van-search v-model="keyword" shape="round" placeholder="标题 / 货号 / 标签" show-action @search="softReload">
        <template #action>
          <div class="search-action" @click="softReload">搜索</div>
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

        <div class="mat-main" ref="mainEl">
          <div class="mat-main__head">
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
            <div v-else class="crumb crumb--muted">{{ headHint }}</div>

            <div class="submenu" :class="{ 'submenu--empty': !submenu.length }">
              <template v-if="submenu.length">
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
              </template>
            </div>
          </div>

          <div class="mat-main__body" :class="{ 'is-switching': switching }">
            <div v-if="switching" class="switch-mask">
              <van-loading size="22px" vertical>加载中</van-loading>
            </div>

            <van-list
              v-model:loading="loading"
              :finished="finished"
              :immediate-check="false"
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
              <van-empty v-if="!loading && !switching && !list.length" description="该分类暂无素材" />
            </van-list>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
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
const switching = ref(false)
const finished = ref(false)
const page = ref(1)
const tree = ref<CatNode[]>([])
const byId = ref<Map<number, CatNode>>(new Map())
const parentOf = ref<Map<number, number>>(new Map())
const mainEl = ref<HTMLElement | null>(null)
/** 本地分类状态，避免每次切分类整页跟着路由闪 */
const selectedId = ref(0)
const mediaType = ref('')
let loadSeq = 0

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

const headHint = computed(() => {
  if (mediaType.value === 'image') return '全部图片'
  if (mediaType.value === 'video') return '全部视频'
  return '全部分类'
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

/** 静默同步 URL，不依赖 watch 触发重载，避免整页感 */
function syncQuery() {
  const query: Record<string, string> = {}
  if (mediaType.value) query.mediaType = mediaType.value
  if (selectedId.value > 0) query.categoryId = String(selectedId.value)
  const cur = route.query
  const same =
    String(cur.mediaType || '') === String(query.mediaType || '') &&
    String(cur.categoryId || '') === String(query.categoryId || '')
  if (same) return
  router.replace({ path: '/material/materials', query }).catch(() => {})
}

function selectCategory(id: number) {
  if (id === selectedId.value) return
  selectedId.value = id
  syncQuery()
  void softReload()
}

function clearMediaType() {
  mediaType.value = ''
  syncQuery()
  void softReload()
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

async function fetchPage(pageNo: number) {
  return materialApi.listMaterials({
    keyword: keyword.value.trim() || undefined,
    mediaType: mediaType.value || undefined,
    categoryId: selectedId.value || undefined,
    includeChildren: selectedId.value ? true : undefined,
    page: pageNo,
    pageSize: 24,
  })
}

/** 切分类：保留旧列表，仅右侧淡出换新，不整页空白闪一下 */
async function softReload() {
  const seq = ++loadSeq
  switching.value = true
  page.value = 1
  finished.value = false
  loading.value = false
  try {
    const res = await fetchPage(1)
    if (seq !== loadSeq) return
    list.value = res.list || []
    if ((res.list || []).length < 24) finished.value = true
    else page.value = 2
    await nextTick()
    if (mainEl.value) mainEl.value.scrollTop = 0
  } catch (e: any) {
    if (seq !== loadSeq) return
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    if (seq === loadSeq) switching.value = false
  }
}

async function loadMore() {
  if (switching.value) {
    loading.value = false
    return
  }
  const seq = loadSeq
  loading.value = true
  try {
    const res = await fetchPage(page.value)
    if (seq !== loadSeq) return
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 24) finished.value = true
    else page.value += 1
  } catch (e: any) {
    if (seq !== loadSeq) return
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

onMounted(async () => {
  const mt = route.query.mediaType
  mediaType.value = typeof mt === 'string' && mt ? mt : ''
  const cid = route.query.categoryId
  if (typeof cid === 'string' && cid) {
    const n = Number(cid)
    if (Number.isFinite(n) && n > 0) selectedId.value = n
  }
  await loadCategories()
  await softReload()
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
  display: flex;
  flex-direction: column;
}
.mat-main__head {
  flex-shrink: 0;
}
.mat-main__body {
  position: relative;
  flex: 1;
  min-height: 120px;
  transition: opacity 0.15s ease;
}
.mat-main__body.is-switching {
  opacity: 0.45;
  pointer-events: none;
}
.switch-mask {
  position: absolute;
  inset: 24px 0 auto;
  z-index: 2;
  display: flex;
  justify-content: center;
  pointer-events: none;
}
.crumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
  font-size: 12px;
  min-height: 18px;
}
.crumb--muted {
  color: var(--ops-muted);
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
  min-height: 36px;
}
.submenu--empty {
  min-height: 0;
  padding-bottom: 0;
  margin-bottom: 0;
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
