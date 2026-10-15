<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="上传素材" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="ready">
      <div class="section-label">入库信息</div>
      <div class="card">
        <van-field
          :model-value="categoryLabel"
          is-link
          readonly
          required
          label="分类"
          placeholder="请选择分类"
          @click="showCat = true"
        />
        <van-field
          v-model="form.titlePrefix"
          label="标题"
          maxlength="120"
          placeholder="可选；多文件自动加序号"
        />
        <van-field v-model="form.tags" label="标签" placeholder="逗号分隔，如：询盘,白底" />
        <van-field v-model="form.productSn" label="资料编码" placeholder="可选弱关联" />
        <van-field
          v-model="form.remark"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          placeholder="可选"
        />
      </div>

      <div class="section-label">文件</div>
      <div class="card">
        <van-uploader
          v-model="mediaFiles"
          multiple
          :max-count="20"
          accept="image/*,video/*"
          :after-read="onMediaRead"
          :before-delete="onMediaDelete"
        />
        <p class="form-tip">支持拍照、相册多选图片/视频，最多 20 个；选完后点下方入库。</p>
      </div>

      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="submit">入库</van-button>
      </div>
    </div>
    <van-loading v-else class="page-loading" vertical>加载中…</van-loading>

    <van-action-sheet
      v-model:show="showCat"
      :actions="catActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickCat"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, type UploaderFileListItem } from 'vant'
import { materialApi } from '../../api/material'

const router = useRouter()
const route = useRoute()
const ready = ref(false)
const saving = ref(false)
const showCat = ref(false)
const categories = ref<{ id: number; name: string; depth: number; code?: string }[]>([])
const mediaFiles = ref<UploaderFileListItem[]>([])

const form = reactive({
  categoryId: 0,
  titlePrefix: '',
  tags: '',
  productSn: '',
  remark: '',
})

const categoryLabel = computed(() => {
  const c = categories.value.find((x) => x.id === form.categoryId)
  return c ? `${'　'.repeat(c.depth)}${c.name}` : ''
})

const catActions = computed(() =>
  categories.value.map((c) => ({
    name: `${'　'.repeat(c.depth)}${c.name}`,
    id: c.id,
  })),
)

function walk(nodes: any[], depth: number, out: { id: number; name: string; depth: number; code?: string }[]) {
  for (const n of nodes || []) {
    out.push({ id: n.id, name: n.name, depth, code: n.code })
    if (n.children?.length) walk(n.children, depth + 1, out)
  }
}

function onPickCat(act: { id?: number }) {
  if (act.id) form.categoryId = act.id
}

async function onMediaRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const list = Array.isArray(item) ? item : [item]
  for (const fileItem of list) {
    if (!fileItem.file) continue
    fileItem.status = 'uploading'
    try {
      const up = await materialApi.uploadMedia(fileItem.file)
      fileItem.url = up.url
      ;(fileItem as any).mediaType = up.mediaType
      ;(fileItem as any).fileName = up.fileName
      ;(fileItem as any).mime = up.mime
      ;(fileItem as any).sizeBytes = up.sizeBytes
      fileItem.status = 'done'
    } catch (e: any) {
      fileItem.status = 'failed'
      showFailToast(e.message || '上传失败')
    }
  }
}

function onMediaDelete() {
  return true
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function submit() {
  if (!form.categoryId) {
    showFailToast('请选择分类')
    return
  }
  const done = mediaFiles.value.filter((f) => f.status === 'done' && f.url)
  const pending = mediaFiles.value.some((f) => f.status === 'uploading')
  if (pending) {
    showFailToast('还有文件正在上传，请稍候')
    return
  }
  if (!done.length) {
    showFailToast('请先添加图片或视频')
    return
  }
  saving.value = true
  try {
    const tags = parseTags(form.tags)
    for (let i = 0; i < done.length; i++) {
      const f = done[i]
      const mediaType = (f as any).mediaType === 'video' ? 'video' : 'image'
      const title =
        done.length === 1
          ? form.titlePrefix.trim() || (f as any).fileName || '素材'
          : form.titlePrefix.trim()
            ? `${form.titlePrefix.trim()} ${i + 1}`
            : (f as any).fileName || `素材 ${i + 1}`
      await materialApi.createMaterial({
        categoryId: form.categoryId,
        title,
        mediaType,
        url: f.url,
        fileName: (f as any).fileName || '',
        mime: (f as any).mime || '',
        sizeBytes: (f as any).sizeBytes || 0,
        tags,
        remark: form.remark,
        productSn: form.productSn,
      })
    }
    showSuccessToast(`已入库 ${done.length} 个`)
    router.replace({ path: '/material/materials', query: { categoryId: String(form.categoryId) } })
  } catch (e: any) {
    showFailToast(e.message || '入库失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const tree = await materialApi.listCategories()
    const out: { id: number; name: string; depth: number; code?: string }[] = []
    walk(Array.isArray(tree) ? tree : [], 0, out)
    categories.value = out
    const q = route.query.categoryId
    const fromQuery = typeof q === 'string' ? Number(q) : 0
    if (fromQuery && out.some((c) => c.id === fromQuery)) {
      form.categoryId = fromQuery
    } else if (out.length) {
      form.categoryId = out[0].id
    }
  } catch (e: any) {
    showFailToast(e.message || '加载分类失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.page-loading {
  padding-top: 48px;
}
.form-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ops-muted);
  line-height: 1.5;
}
</style>
