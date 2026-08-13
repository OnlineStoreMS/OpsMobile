<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="素材详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card preview">
        <img
          v-if="detail.mediaType === 'image'"
          :src="materialAssetUrl(detail.url)"
          class="preview-img"
          alt=""
        />
        <video
          v-else-if="detail.mediaType === 'video'"
          class="preview-img"
          controls
          :poster="materialAssetUrl(detail.coverUrl)"
          :src="materialAssetUrl(detail.url)"
        />
        <div v-else class="muted">无法预览</div>
      </div>
      <div class="card">
        <div class="order-card__no">{{ detail.title || detail.fileName || '未命名' }}</div>
        <div class="kv"><span>类型</span><span>{{ detail.mediaType === 'video' ? '视频' : '图片' }}</span></div>
        <div class="kv"><span>货号</span><span>{{ detail.productSn || '-' }}</span></div>
        <div class="kv"><span>标签</span><span>{{ (detail.tags || []).join('、') || '-' }}</span></div>
        <div class="kv"><span>尺寸</span><span>{{ sizeText }}</span></div>
        <div class="kv"><span>备注</span><span>{{ detail.remark || '-' }}</span></div>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { materialApi, materialAssetUrl } from '../../api/material'

const router = useRouter()
const route = useRoute()
const detail = ref<any>(null)

const sizeText = computed(() => {
  const d = detail.value
  if (!d) return '-'
  if (d.width && d.height) return `${d.width}×${d.height}`
  return '-'
})

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) return
  try {
    detail.value = await materialApi.getMaterial(id)
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  }
})
</script>

<style scoped>
.preview {
  padding: 8px;
}
.preview-img {
  width: 100%;
  border-radius: 12px;
  display: block;
  max-height: 60vh;
  object-fit: contain;
  background: #0b1f2a;
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
  flex-shrink: 0;
}
.page-loading {
  padding-top: 48px;
}
</style>
