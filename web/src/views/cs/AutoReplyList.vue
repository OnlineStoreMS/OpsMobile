<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="自动回复" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/customer-service/auto-reply/new')">新建</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <div class="llm-bar" @click="router.push('/customer-service/llm')">
        <div>
          <div class="llm-bar__title">DeepSeek</div>
          <div class="llm-bar__desc">{{ llmHint }}</div>
        </div>
        <van-tag plain :type="llmTag.type">{{ llmTag.label }}</van-tag>
      </div>

      <div class="tool-row">
        <van-button size="small" plain hairline type="primary" :loading="seeding" @click="seedPresets">
          写入寒暄模板
        </van-button>
      </div>
      <p class="list-hint">规则按优先级从低到高匹配。店铺留空表示全部店铺。</p>

      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in list" :key="row.id" class="order-card" @click="openActions(row)">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.name }}</div>
            <van-tag plain :type="row.enabled ? 'success' : 'default'">
              {{ row.enabled ? '启用' : '停用' }}
            </van-tag>
          </div>
          <div class="muted">{{ matchLabel(row.matchMode) }} · {{ shopLabel(row) }}</div>
          <div class="muted">关键词 {{ row.keywords }}</div>
          <div class="reply-preview">{{ row.replyText }}</div>
          <div class="muted">优先级 {{ row.priority }} · 冷却 {{ row.cooldownSec }}s</div>
          <div class="card-foot" @click.stop>
            <span class="muted">启用</span>
            <van-switch
              :model-value="row.enabled"
              size="20px"
              @update:model-value="(v) => toggleEnabled(row, Boolean(v))"
            />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无规则" />
      </van-list>
    </div>

    <van-action-sheet
      v-model:show="showActions"
      :actions="actions"
      cancel-text="取消"
      close-on-click-action
      @select="onAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { csApi, type CsAutoReplyRule, type CsLlmSetting } from '../../api/cs'

const router = useRouter()
const loading = ref(false)
const seeding = ref(false)
const list = ref<CsAutoReplyRule[]>([])
const llm = ref<CsLlmSetting | null>(null)
const current = ref<CsAutoReplyRule | null>(null)
const showActions = ref(false)

const actions = [
  { name: '编辑', value: 'edit' },
  { name: '删除', value: 'delete', color: '#e11d48' },
]

const llmHint = computed(() => {
  if (!llm.value) return '加载中'
  if (!llm.value.configured) return '未配置 API Key'
  return llm.value.model || 'DeepSeek'
})

const llmTag = computed(() => {
  if (!llm.value?.configured) return { label: '未配置', type: 'warning' as const }
  if (llm.value.enabled) return { label: '已开启', type: 'success' as const }
  return { label: '已关闭', type: 'default' as const }
})

function matchLabel(mode: string) {
  return mode === 'contains' ? '包含匹配' : '精确匹配'
}

function shopLabel(row: CsAutoReplyRule) {
  if (!row.shopId) return '全部店铺'
  return row.shopName || `店铺 ${row.shopId}`
}

async function loadData() {
  loading.value = true
  try {
    const [rules, setting] = await Promise.all([csApi.listAutoReplyRules(), csApi.getLlmSetting()])
    list.value = rules || []
    llm.value = setting
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openActions(row: CsAutoReplyRule) {
  current.value = row
  showActions.value = true
}

async function toggleEnabled(row: CsAutoReplyRule, enabled: boolean) {
  const prev = row.enabled
  row.enabled = enabled
  try {
    await csApi.updateAutoReplyRule(row.id, {
      enabled,
      name: row.name,
      keywords: row.keywords,
      replyText: row.replyText,
    })
  } catch (e: any) {
    row.enabled = prev
    showFailToast(e.message || '更新失败')
  }
}

async function seedPresets() {
  try {
    await showConfirmDialog({
      title: '写入寒暄模板',
      message: '会写入一组常见寒暄规则（已有同名规则则跳过）。',
    })
  } catch {
    return
  }
  seeding.value = true
  try {
    await csApi.seedAutoReplyPresets()
    showSuccessToast('已写入模板')
    await loadData()
  } catch (e: any) {
    showFailToast(e.message || '写入失败')
  } finally {
    seeding.value = false
  }
}

async function onAction(act: { value?: string }) {
  const row = current.value
  if (!row || !act.value) return
  if (act.value === 'edit') {
    router.push(`/customer-service/auto-reply/${row.id}`)
    return
  }
  if (act.value === 'delete') {
    try {
      await showConfirmDialog({
        title: '删除规则',
        message: `确定删除「${row.name}」？`,
        confirmButtonText: '删除',
        confirmButtonColor: '#e11d48',
      })
      await csApi.deleteAutoReplyRule(row.id)
      showSuccessToast('已删除')
      await loadData()
    } catch (e: any) {
      if (e !== 'cancel') showFailToast(e.message || '删除失败')
    }
  }
}

onMounted(loadData)
</script>

<style scoped>
.llm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 16px 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 0 rgba(15, 31, 42, 0.04);
}
.llm-bar__title {
  font-size: 15px;
  font-weight: 700;
}
.llm-bar__desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ops-muted);
}
.tool-row {
  padding: 8px 16px 0;
}
.list-hint {
  margin: 8px 16px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-ink-soft);
}
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
}
.reply-preview {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ops-ink);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--ops-line);
}
</style>
