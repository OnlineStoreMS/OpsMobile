<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="editingId ? '编辑规则' : '新建规则'" left-arrow @click-left="router.back()" />
    <div v-if="ready" class="page-body">
      <div class="section-label">匹配</div>
      <div class="card">
        <van-field v-model="form.name" label="名称" required maxlength="80" placeholder="必填" />
        <van-field
          :model-value="shopLabel"
          is-link
          readonly
          label="店铺"
          placeholder="全部店铺"
          @click="showShop = true"
        />
        <van-field
          :model-value="matchLabel"
          is-link
          readonly
          label="匹配方式"
          @click="showMatch = true"
        />
        <van-field
          v-model="form.keywords"
          label="关键词"
          required
          type="textarea"
          rows="2"
          autosize
          placeholder="多个关键词用逗号或换行分隔"
        />
      </div>

      <div class="section-label">回复</div>
      <div class="card">
        <van-field
          v-model="form.replyText"
          label="回复内容"
          required
          type="textarea"
          rows="4"
          autosize
          placeholder="买家命中后自动发出的内容"
        />
        <van-field v-model="priorityText" type="digit" label="优先级" placeholder="数字越小越先匹配" />
        <van-field v-model="cooldownText" type="digit" label="冷却秒数" placeholder="同一买家冷却" />
        <van-cell center title="启用">
          <template #right-icon>
            <van-switch v-model="form.enabled" size="20px" />
          </template>
        </van-cell>
      </div>

      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
        <van-button
          v-if="editingId"
          class="danger-btn"
          block
          round
          plain
          hairline
          type="danger"
          :loading="removing"
          @click="remove"
        >
          删除
        </van-button>
      </div>
    </div>
    <van-loading v-else class="page-loading" />

    <van-action-sheet
      v-model:show="showShop"
      :actions="shopActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickShop"
    />
    <van-action-sheet
      v-model:show="showMatch"
      :actions="matchActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickMatch"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { csApi, type CsShop } from '../../api/cs'

const route = useRoute()
const router = useRouter()
const ready = ref(false)
const saving = ref(false)
const removing = ref(false)
const editingId = ref(0)
const shops = ref<CsShop[]>([])
const showShop = ref(false)
const showMatch = ref(false)

const form = reactive({
  name: '',
  shopId: 0,
  matchMode: 'exact',
  keywords: '',
  replyText: '',
  enabled: true,
  priority: 100,
  cooldownSec: 30,
})

const priorityText = computed({
  get: () => String(form.priority),
  set: (v: string) => {
    form.priority = Number(v || 0)
  },
})

const cooldownText = computed({
  get: () => String(form.cooldownSec),
  set: (v: string) => {
    form.cooldownSec = Number(v || 0)
  },
})

const shopActions = computed(() => [
  { name: '全部店铺', value: 0 },
  ...shops.value.map((s) => ({ name: s.name, value: s.id })),
])

const matchActions = [
  { name: '精确匹配', value: 'exact' },
  { name: '包含匹配', value: 'contains' },
]

const shopLabel = computed(() => {
  if (!form.shopId) return '全部店铺'
  return shops.value.find((s) => s.id === form.shopId)?.name || `店铺 ${form.shopId}`
})

const matchLabel = computed(() => (form.matchMode === 'contains' ? '包含匹配' : '精确匹配'))

function onPickShop(act: { value?: number }) {
  if (act.value === undefined) return
  form.shopId = Number(act.value)
}

function onPickMatch(act: { value?: string }) {
  if (act.value) form.matchMode = act.value
}

async function save() {
  if (!form.name.trim() || !form.keywords.trim() || !form.replyText.trim()) {
    showFailToast('请填写名称、关键词和回复内容')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      shopId: form.shopId,
      matchMode: form.matchMode,
      keywords: form.keywords.trim(),
      replyText: form.replyText.trim(),
      enabled: form.enabled,
      priority: form.priority,
      cooldownSec: form.cooldownSec,
    }
    if (editingId.value) {
      await csApi.updateAutoReplyRule(editingId.value, payload)
      showSuccessToast('已保存')
    } else {
      await csApi.createAutoReplyRule(payload)
      showSuccessToast('已创建')
    }
    router.replace('/customer-service/auto-reply')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!editingId.value) return
  try {
    await showConfirmDialog({
      title: '删除规则',
      message: `确定删除「${form.name}」？`,
      confirmButtonText: '删除',
      confirmButtonColor: '#e11d48',
    })
  } catch {
    return
  }
  removing.value = true
  try {
    await csApi.deleteAutoReplyRule(editingId.value)
    showSuccessToast('已删除')
    router.replace('/customer-service/auto-reply')
  } catch (e: any) {
    showFailToast(e.message || '删除失败')
  } finally {
    removing.value = false
  }
}

onMounted(async () => {
  try {
    shops.value = (await csApi.listShops()) || []
    const id = Number(route.params.id)
    if (id) {
      editingId.value = id
      const rules = (await csApi.listAutoReplyRules()) || []
      const row = rules.find((r) => r.id === id)
      if (!row) {
        showFailToast('规则不存在')
        router.back()
        return
      }
      form.name = row.name
      form.shopId = row.shopId || 0
      form.matchMode = row.matchMode || 'exact'
      form.keywords = row.keywords
      form.replyText = row.replyText
      form.enabled = row.enabled
      form.priority = row.priority
      form.cooldownSec = row.cooldownSec
    }
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.footer-safe {
  padding: 8px 16px calc(12px + var(--ops-safe-bottom));
}
.danger-btn {
  margin-top: 10px;
}
.page-loading {
  padding-top: 48px;
}
</style>
