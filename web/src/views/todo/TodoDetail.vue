<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待办详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card">
        <div class="order-card__no">{{ detail.title }}</div>
        <div class="tag-row">
          <van-tag plain type="primary">{{ labelTodoStatus(detail.status) }}</van-tag>
          <van-tag plain>优先级 {{ labelTodoPriority(detail.priority) }}</van-tag>
        </div>
        <div class="kv"><span>分类</span><span>{{ detail.categoryName || '-' }}</span></div>
        <div class="kv"><span>截止</span><span>{{ formatTime(detail.dueAt) }}</span></div>
        <div class="desc" v-if="detail.description">{{ detail.description }}</div>
      </div>

      <div class="section-label" v-if="(detail.images || []).length">附件</div>
      <div class="img-row" v-if="(detail.images || []).length">
        <img
          v-for="(img, i) in detail.images"
          :key="i"
          :src="img.url"
          class="img-thumb"
          alt=""
          @click="preview(i)"
        />
      </div>

      <div class="footer-safe" v-if="canAct">
        <van-button
          v-if="detail.status === 'pending'"
          type="primary"
          block
          round
          :loading="acting"
          @click="setStatus('in_progress')"
        >
          开始处理
        </van-button>
        <van-button
          v-if="detail.status === 'pending' || detail.status === 'in_progress'"
          type="primary"
          block
          round
          :loading="acting"
          @click="setStatus('done')"
        >
          标记完成
        </van-button>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showImagePreview, showSuccessToast } from 'vant'
import { labelTodoPriority, labelTodoStatus, todoApi } from '../../api/todo'

const router = useRouter()
const route = useRoute()
const detail = ref<any>(null)
const acting = ref(false)

const canAct = computed(() => {
  const s = detail.value?.status
  return s === 'pending' || s === 'in_progress'
})

function formatTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

function preview(start: number) {
  const urls = (detail.value?.images || []).map((x: any) => x.url).filter(Boolean)
  if (!urls.length) return
  showImagePreview({ images: urls, startPosition: start })
}

async function setStatus(status: string) {
  if (!detail.value?.id) return
  acting.value = true
  try {
    detail.value = await todoApi.updateStatus(detail.value.id, status)
    showSuccessToast('已更新')
  } catch (e: any) {
    showFailToast(e.message || '更新失败')
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) return
  try {
    detail.value = await todoApi.getTodo(id)
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  }
})
</script>

<style scoped>
.tag-row {
  display: flex;
  gap: 6px;
  margin: 8px 0 12px;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 4px 0;
}
.kv span:first-child {
  color: var(--ops-muted);
}
.desc {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.img-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.img-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 10px;
}
.footer-safe {
  display: grid;
  gap: 10px;
  padding: 8px 0 calc(12px + var(--ops-safe-bottom));
}
.page-loading {
  padding-top: 48px;
}
</style>
