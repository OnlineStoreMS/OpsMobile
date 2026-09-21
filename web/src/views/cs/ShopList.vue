<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="店铺管理" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/customer-service/shops/new')">添加</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <p class="list-hint">绑定码给 Windows 插件用。监控关掉后插件不再上报、也不自动回复。</p>
      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in list" :key="row.id" class="order-card" @click="openActions(row)">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.name }}</div>
            <van-tag plain :type="statusMeta(row.pluginStatus).type">
              {{ statusMeta(row.pluginStatus).label }}
            </van-tag>
          </div>
          <div class="muted">
            {{ row.platformLabel || platformLabel(row.platform) }}
            <template v-if="row.platformShopName"> · {{ row.platformShopName }}</template>
          </div>
          <div v-if="row.platformShopId" class="muted">店铺 ID {{ row.platformShopId }}</div>
          <div class="muted">绑定码 {{ row.bindCode || '—' }}</div>
          <div class="muted">最近心跳 {{ formatTime(row.lastSeenAt) || '—' }}</div>
          <div v-if="row.remark" class="muted">{{ row.remark }}</div>
          <div class="card-foot" @click.stop>
            <span class="muted">监控</span>
            <van-switch
              :model-value="row.monitorEnabled"
              size="20px"
              @update:model-value="(v) => toggleMonitor(row, Boolean(v))"
            />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无店铺" />
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
import { csApi, type CsShop } from '../../api/cs'
import { copyToClipboard } from '../../utils/clipboard'
import { formatTime } from '../../utils/labels'

const router = useRouter()
const loading = ref(false)
const list = ref<CsShop[]>([])
const current = ref<CsShop | null>(null)
const showActions = ref(false)

const PLUGIN_STATUS: Record<string, { label: string; type: 'success' | 'primary' | 'warning' | 'danger' | 'default' }> = {
  online: { label: '在线', type: 'success' },
  bound: { label: '已绑定', type: 'primary' },
  offline: { label: '离线', type: 'danger' },
  unbound: { label: '未绑定', type: 'warning' },
}

function statusMeta(status: string) {
  return PLUGIN_STATUS[status] || { label: status || '未知', type: 'default' as const }
}

function platformLabel(platform: string) {
  if (platform === 'doudian') return '抖店'
  return platform || '—'
}

const actions = computed(() => [
  { name: '复制绑定码', value: 'copy' },
  { name: '编辑店铺', value: 'edit' },
  { name: '轮换绑定码', value: 'rotate' },
  { name: '重置插件', value: 'reset', color: '#e11d48' },
])

async function loadData() {
  loading.value = true
  try {
    list.value = (await csApi.listShops()) || []
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openActions(row: CsShop) {
  current.value = row
  showActions.value = true
}

async function toggleMonitor(row: CsShop, enabled: boolean) {
  const prev = row.monitorEnabled
  row.monitorEnabled = enabled
  try {
    await csApi.updateShop(row.id, { monitorEnabled: enabled })
    showSuccessToast(enabled ? '已开启监控' : '已关闭监控')
  } catch (e: any) {
    row.monitorEnabled = prev
    showFailToast(e.message || '更新失败')
  }
}

async function onAction(act: { value?: string }) {
  const row = current.value
  if (!row || !act.value) return
  if (act.value === 'copy') {
    const ok = await copyToClipboard(row.bindCode)
    showSuccessToast(ok ? '已复制绑定码' : row.bindCode || '无绑定码')
    return
  }
  if (act.value === 'edit') {
    router.push(`/customer-service/shops/${row.id}/edit`)
    return
  }
  if (act.value === 'rotate') {
    try {
      await showConfirmDialog({
        title: '轮换绑定码',
        message: `「${row.name}」将生成新绑定码，旧码立刻失效。已绑定的插件需要重新绑定。`,
      })
      const next = await csApi.rotateBindCode(row.id)
      showSuccessToast(`新绑定码 ${next.bindCode}`)
      await loadData()
    } catch (e: any) {
      if (e !== 'cancel') showFailToast(e.message || '轮换失败')
    }
    return
  }
  if (act.value === 'reset') {
    try {
      await showConfirmDialog({
        title: '重置插件',
        message: `确定重置「${row.name}」的插件绑定？插件会掉线，需用绑定码重新接入。`,
        confirmButtonText: '重置',
        confirmButtonColor: '#e11d48',
      })
      await csApi.resetPlugin(row.id)
      showSuccessToast('已重置插件')
      await loadData()
    } catch (e: any) {
      if (e !== 'cancel') showFailToast(e.message || '重置失败')
    }
  }
}

onMounted(loadData)
</script>

<style scoped>
.list-hint {
  margin: 0 16px 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-ink-soft);
}
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
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
