<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="标题 / 货号 / 标签" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div class="mat-grid">
          <div
            v-for="row in list"
            :key="row.id"
            class="mat-card"
            @click="router.push(`/material/materials/${row.id}`)"
          >
            <div class="mat-thumb">
              <img v-if="thumb(row)" :src="thumb(row)" alt="" />
              <div v-else class="mat-thumb__empty">{{ row.mediaType === 'video' ? '视频' : '无图' }}</div>
              <van-tag v-if="row.mediaType === 'video'" class="mat-badge" type="primary">视频</van-tag>
            </div>
            <div class="mat-title">{{ row.title || row.fileName || '未命名' }}</div>
            <div class="muted mat-meta">{{ row.productSn || '' }}</div>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无素材" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { materialApi, materialAssetUrl } from '../../api/material'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const mediaType = computed(() => {
  const v = route.query.mediaType
  return typeof v === 'string' && v ? v : ''
})
const categoryId = computed(() => {
  const v = route.query.categoryId
  return typeof v === 'string' && v ? Number(v) : undefined
})

const navTitle = computed(() => {
  if (mediaType.value === 'image') return '图片素材'
  if (mediaType.value === 'video') return '视频素材'
  if (categoryId.value) return '分类素材'
  return '全部素材'
})

function thumb(row: any) {
  return materialAssetUrl(row.coverUrl || (row.mediaType === 'image' ? row.url : '') || '')
}

async function loadMore() {
  loading.value = true
  try {
    const res = await materialApi.listMaterials({
      keyword: keyword.value.trim() || undefined,
      mediaType: mediaType.value || undefined,
      categoryId: categoryId.value || undefined,
      includeChildren: categoryId.value ? true : undefined,
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
</script>

<style scoped>
.mat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 4px 2px 12px;
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
