<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="pageTitle" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="ready">
      <div class="section-label">基本信息</div>
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
        <van-field v-model="form.title" label="标题" required maxlength="200" placeholder="必填" />
        <van-field
          v-model="form.description"
          label="说明"
          type="textarea"
          rows="3"
          autosize
          placeholder="可选"
        />
      </div>

      <div class="section-label">规则</div>
      <div class="card">
        <van-field
          v-if="!editingIsInstance"
          :model-value="recurrenceLabel"
          is-link
          readonly
          label="循环"
          @click="showRecurrence = true"
        />
        <van-field
          v-if="isMonthlyForm && !editingIsInstance"
          :model-value="`每月 ${form.recurrenceDay} 日`"
          is-link
          readonly
          label="每月几号"
          @click="showDay = true"
        />
        <p v-if="isMonthlyForm && !editingIsInstance" class="form-tip">每月自动生成一条待处理实例</p>
        <p v-if="editingIsInstance" class="form-tip">这是本月实例，改内容只影响本月。</p>
        <van-field
          v-if="!isMonthlyForm || editingIsInstance"
          :model-value="statusLabel"
          is-link
          readonly
          label="状态"
          @click="showStatus = true"
        />
        <van-field
          :model-value="priorityLabel"
          is-link
          readonly
          label="优先级"
          @click="showPriority = true"
        />
        <van-field
          v-if="!isMonthlyForm || editingIsInstance"
          :model-value="dueDisplay"
          is-link
          readonly
          label="截止时间"
          placeholder="可选"
          @click="openDuePicker"
        />
      </div>

      <div class="section-label">图片笔记</div>
      <div class="card">
        <van-uploader
          v-model="mediaFiles"
          multiple
          :max-count="12"
          accept="image/*,video/*"
          :after-read="onMediaRead"
        />
        <p class="form-tip">支持图片和视频，最多 12 个，与电脑端待办笔记共用。</p>
      </div>

      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
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
    <van-action-sheet
      v-model:show="showRecurrence"
      :actions="recurrenceActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickRecurrence"
    />
    <van-action-sheet
      v-model:show="showDay"
      :actions="dayActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickDay"
    />
    <van-action-sheet
      v-model:show="showStatus"
      :actions="statusActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickStatus"
    />
    <van-action-sheet
      v-model:show="showPriority"
      :actions="priorityActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickPriority"
    />
    <van-popup v-model:show="showDue" position="bottom" round teleport="body">
      <van-date-picker
        v-if="dueStep === 'date'"
        :model-value="dueDateCols"
        title="选择截止日期"
        :min-date="dueMinDate"
        :max-date="dueMaxDate"
        @confirm="onDueDate"
        @cancel="showDue = false"
      />
      <van-time-picker
        v-else
        :model-value="dueTimeCols"
        title="选择截止时刻"
        @confirm="onDueTime"
        @cancel="showDue = false"
      />
      <div v-if="dueLocal" class="due-clear">
        <van-button block round @click="clearDue">清除截止时间</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, type UploaderFileListItem } from 'vant'
import {
  TODO_PRIORITY_MAP,
  TODO_PRIORITY_OPTIONS,
  TODO_STATUS_MAP,
  TODO_STATUS_OPTIONS,
  todoApi,
  type MediaItem,
  type TodoCategory,
} from '../../api/todo'

const route = useRoute()
const router = useRouter()
const ready = ref(false)
const saving = ref(false)
const categories = ref<TodoCategory[]>([])
const mediaFiles = ref<UploaderFileListItem[]>([])
const dueLocal = ref('')
const showDue = ref(false)
const dueStep = ref<'date' | 'time'>('date')
const dueDateCols = ref<string[]>([])
const dueTimeCols = ref<string[]>(['18', '00'])
const dueMinDate = new Date(new Date().getFullYear() - 1, 0, 1)
const dueMaxDate = new Date(new Date().getFullYear() + 2, 11, 31)
const editingId = ref(0)
const editingIsTemplate = ref(false)
const editingIsInstance = ref(false)
const showCat = ref(false)
const showRecurrence = ref(false)
const showDay = ref(false)
const showStatus = ref(false)
const showPriority = ref(false)

const form = reactive({
  categoryId: 0,
  title: '',
  description: '',
  status: 'pending',
  priority: 'normal',
  recurrence: 'none',
  recurrenceDay: 1,
})

const isEdit = computed(() => editingId.value > 0)
const isMonthlyForm = computed(() => form.recurrence === 'monthly')
const pageTitle = computed(() => {
  if (!isEdit.value) return '新建待办'
  if (editingIsTemplate.value) return '编辑固定月待办'
  if (editingIsInstance.value) return '编辑本月待办'
  return '编辑待办'
})
const categoryLabel = computed(() => categories.value.find((c) => c.id === form.categoryId)?.name || '')
const recurrenceLabel = computed(() => (form.recurrence === 'monthly' ? '固定月待办' : '普通待办'))
const statusLabel = computed(() => TODO_STATUS_MAP[form.status] || form.status)
const priorityLabel = computed(() => TODO_PRIORITY_MAP[form.priority] || form.priority)
const catActions = computed(() => categories.value.map((c) => ({ name: c.name, id: c.id })))
const recurrenceActions = [
  { name: '普通待办', value: 'none' },
  { name: '固定月待办', value: 'monthly' },
]
const dayActions = Array.from({ length: 28 }, (_, i) => ({ name: `每月 ${i + 1} 日`, value: i + 1 }))
const statusActions = TODO_STATUS_OPTIONS.map((o) => ({ name: o.label, value: o.value }))
const priorityActions = TODO_PRIORITY_OPTIONS.map((o) => ({ name: o.label, value: o.value }))

const dueDisplay = computed(() => {
  const s = fromLocalInput(dueLocal.value)
  return s ? s.slice(0, 16) : ''
})

function pad2(n: number | string) {
  return String(n).padStart(2, '0')
}

function toLocalInput(raw?: string) {
  if (!raw) return ''
  const s = String(raw).trim()
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/)
  if (!m) return ''
  const time = m[4] != null ? `${pad2(m[4])}:${pad2(m[5] || '00')}` : '18:00'
  return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}T${time}`
}

function splitDue(raw: string) {
  const v = toLocalInput(raw)
  if (!v) {
    const now = new Date()
    return {
      date: [String(now.getFullYear()), pad2(now.getMonth() + 1), pad2(now.getDate())],
      time: ['18', '00'],
    }
  }
  return {
    date: [v.slice(0, 4), v.slice(5, 7), v.slice(8, 10)],
    time: [v.slice(11, 13), v.slice(14, 16)],
  }
}

function openDuePicker() {
  const split = splitDue(dueLocal.value)
  dueDateCols.value = split.date
  dueTimeCols.value = split.time
  dueStep.value = 'date'
  showDue.value = true
}

function onDueDate(payload: { selectedValues?: string[] }) {
  const vals = payload.selectedValues || dueDateCols.value
  if (vals.length >= 3) dueDateCols.value = [vals[0], pad2(vals[1]), pad2(vals[2])]
  dueStep.value = 'time'
}

function onDueTime(payload: { selectedValues?: string[] }) {
  const vals = payload.selectedValues || dueTimeCols.value
  if (vals.length >= 2) dueTimeCols.value = [pad2(vals[0]), pad2(vals[1])]
  dueLocal.value = `${dueDateCols.value[0]}-${dueDateCols.value[1]}-${dueDateCols.value[2]}T${dueTimeCols.value[0]}:${dueTimeCols.value[1]}`
  showDue.value = false
}

function clearDue() {
  dueLocal.value = ''
  showDue.value = false
}

function fromLocalInput(raw: string) {
  const s = String(raw || '').trim()
  if (!s) return ''
  const v = s.replace('T', ' ')
  return v.length === 16 ? `${v}:00` : v
}

function mediaFromFiles(): MediaItem[] {
  return mediaFiles.value
    .filter((f) => f.url && f.status !== 'failed')
    .map((f) => ({
      url: String(f.url),
      mediaType: (f.file && f.file.type.startsWith('video/')) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(f.url))
        ? 'video'
        : 'image',
    }))
}

function onPickCat(act: { id?: number }) {
  if (act.id) form.categoryId = act.id
}

function onPickRecurrence(act: { value?: string }) {
  if (act.value) form.recurrence = act.value
}

function onPickDay(act: { value?: number }) {
  if (act.value) form.recurrenceDay = act.value
}

function onPickStatus(act: { value?: string }) {
  if (act.value) form.status = act.value
}

function onPickPriority(act: { value?: string }) {
  if (act.value) form.priority = act.value
}

async function onMediaRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const list = Array.isArray(item) ? item : [item]
  for (const fileItem of list) {
    if (!fileItem.file) continue
    fileItem.status = 'uploading'
    try {
      const up = await todoApi.uploadMedia(fileItem.file)
      fileItem.url = up.url
      fileItem.status = 'done'
    } catch (e: any) {
      fileItem.status = 'failed'
      showFailToast(e.message || '上传失败')
    }
  }
}

async function save() {
  if (!form.title.trim()) {
    showFailToast('请填写标题')
    return
  }
  if (!form.categoryId) {
    showFailToast('请选择分类')
    return
  }
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      images: mediaFromFiles(),
    }
    if (editingIsInstance.value) {
      payload.dueAt = fromLocalInput(dueLocal.value) || undefined
      if (!dueLocal.value) payload.clearDueAt = true
    } else {
      payload.recurrence = form.recurrence
      payload.recurrenceDay = form.recurrence === 'monthly' ? form.recurrenceDay : 1
      if (form.recurrence === 'none') {
        payload.dueAt = fromLocalInput(dueLocal.value) || undefined
        if (!dueLocal.value) payload.clearDueAt = true
      }
    }
    if (editingId.value) {
      await todoApi.updateTodo(editingId.value, payload)
      showSuccessToast('已保存')
    } else {
      const created = await todoApi.createTodo(payload as any)
      showSuccessToast(form.recurrence === 'monthly' ? '已创建月待办' : '已创建')
      router.replace(`/todo/todos/${created.id}`)
      return
    }
    router.back()
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    categories.value = ((await todoApi.listCategories()) || []).filter((c) => c.enabled !== 0)
    const id = Number(route.params.id)
    if (id) {
      const row = await todoApi.getTodo(id)
      editingId.value = row.id
      editingIsTemplate.value = !!row.isTemplate
      editingIsInstance.value = !!row.isMonthlyInstance
      form.categoryId = row.categoryId
      form.title = row.title
      form.description = row.description || ''
      form.status = row.status || 'pending'
      form.priority = row.priority || 'normal'
      form.recurrence = row.isTemplate || row.recurrence === 'monthly' ? 'monthly' : 'none'
      if (row.isMonthlyInstance) form.recurrence = 'monthly'
      form.recurrenceDay = row.recurrenceDay || 1
      dueLocal.value = toLocalInput(row.dueAt)
      mediaFiles.value = (row.images || []).map((img) => ({
        url: img.url,
        status: 'done' as const,
        isImage: img.mediaType !== 'video',
      }))
    } else if (categories.value.length) {
      form.categoryId = categories.value[0].id
    }
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.form-tip {
  margin: 0 16px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-muted);
}
.footer-safe {
  padding: 8px 0 calc(12px + var(--ops-safe-bottom));
}
.page-loading {
  padding-top: 48px;
}
.due-clear {
  padding: 0 16px calc(12px + var(--ops-safe-bottom));
}
</style>
