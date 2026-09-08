<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="店铺列表" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openForm()">添加</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <div class="sync-bar">
        <span>自动采集间隔</span>
        <button type="button" class="status-chip" @click="showSync = true">
          {{ syncLabel }}
        </button>
      </div>
      <p class="list-hint">
        从 Agents 已上线店铺创建采集；「立即执行」下发到 WindowsAgent。
      </p>
      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in list" :key="row.id" class="order-card" @click="openActions(row)">
          <div class="order-card__top">
            <div class="order-card__no">
              {{ row.name }}
              <span v-if="row.pendingTicketCount" class="tile-count">{{ row.pendingTicketCount }}</span>
            </div>
            <van-tag v-if="!row.pluginAvailable" plain type="warning">未提供</van-tag>
            <van-tag v-else plain :type="PLUGIN_STATUS_MAP[row.pluginStatus].type">
              {{ PLUGIN_STATUS_MAP[row.pluginStatus].label }}
            </van-tag>
          </div>
          <div class="muted">
            {{ row.platformLabel }}
            <template v-if="row.platformShopName"> · {{ row.platformShopName }}</template>
          </div>
          <div v-if="row.platformShopId" class="muted">店铺 ID {{ row.platformShopId }}</div>
          <div class="muted">最近同步 {{ formatTime(row.lastSyncAt) || '—' }}</div>
          <div class="muted">下次同步 {{ formatTime(row.nextSyncAt) || '—' }}</div>
          <div v-if="row.syncRequested" class="tone-warning">已请求立即执行，等待 Agents 采集</div>
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
    <van-action-sheet
      v-model:show="showSync"
      :actions="syncActions"
      cancel-text="取消"
      close-on-click-action
      @select="onSaveSync"
    />

    <van-popup v-model:show="showForm" position="bottom" round teleport="body" class="sheet-popup" safe-area-inset-bottom>
      <div class="sheet">
        <div class="sheet-title">{{ form.id ? '编辑店铺' : '添加采集' }}</div>
        <van-field
          v-model="form.platformLabel"
          label="平台"
          readonly
          :disabled="!!form.id"
          :is-link="!form.id"
          @click="!form.id && (showPlatform = true)"
        />
        <template v-if="!form.id">
          <van-field
            v-model="form.onlineShopLabel"
            label="上线店铺"
            readonly
            is-link
            required
            placeholder="选择 Agents 已上线店铺"
            @click="openOnlinePicker"
          />
          <van-field
            v-model="form.intervalLabel"
            label="采集间隔"
            readonly
            is-link
            @click="showInterval = true"
          />
        </template>
        <van-field v-model="form.name" label="名称" required placeholder="店铺名称" />
        <van-field v-if="form.id" v-model="form.platformShopId" label="店铺 ID" placeholder="平台店铺 ID" />
        <van-field v-model="form.remark" label="备注" placeholder="可选" />
        <div class="pay-sheet-actions">
          <van-button block round @click="showForm = false">取消</van-button>
          <van-button type="primary" block round :loading="saving" @click="saveShop">保存</van-button>
        </div>
      </div>
    </van-popup>
    <van-action-sheet
      v-model:show="showPlatform"
      :actions="platformActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickPlatform"
    />
    <van-action-sheet
      v-model:show="showOnline"
      :actions="onlineActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickOnline"
    />
    <van-action-sheet
      v-model:show="showInterval"
      :actions="syncActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickInterval"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import {
  PLATFORM_OPTIONS,
  PLUGIN_STATUS_MAP,
  PLUGIN_SYNC_OPTIONS,
  aftersalesApi,
  type AgentOnlineShop,
  type MarketplaceShop,
  type ShopPlatform,
} from '../../api/aftersales'
import { formatTime } from '../../utils/ticketLogistics'

const router = useRouter()
const list = ref<MarketplaceShop[]>([])
const onlineShops = ref<AgentOnlineShop[]>([])
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const showActions = ref(false)
const showSync = ref(false)
const showPlatform = ref(false)
const showOnline = ref(false)
const showInterval = ref(false)
const current = ref<MarketplaceShop | null>(null)
const syncMinutes = ref(30)
const form = reactive({
  id: 0,
  name: '',
  platform: 'doudian' as ShopPlatform,
  platformLabel: '抖店',
  platformShopId: '',
  platformShopName: '',
  onlineShopLabel: '',
  intervalMinutes: 30,
  intervalLabel: '每 30 分钟',
  remark: '',
})

const syncLabel = computed(
  () => PLUGIN_SYNC_OPTIONS.find((o) => o.value === syncMinutes.value)?.label || '每 30 分钟',
)
const syncActions = PLUGIN_SYNC_OPTIONS.map((o) => ({ name: o.label, value: o.value }))
const platformActions = PLATFORM_OPTIONS.map((o) => ({ name: o.label, value: o.value }))
const onlineActions = computed(() =>
  onlineShops.value.map((s) => ({
    name: `${s.platformShopName || s.platformShopId}（${s.platformShopId} · ${s.agentName || '节点'}）`,
    value: s.platformShopId,
  })),
)
const actions = computed(() => {
  const row = current.value
  const items: Array<{ name: string; value: string; color?: string }> = [
    { name: '打开工作台', value: 'workbench' },
  ]
  if (row?.pluginAvailable && row.pluginStatus === 'unbound') {
    items.push({ name: '启用采集', value: 'enable' })
  }
  if (row && row.pluginStatus !== 'unbound') {
    items.push({ name: '立即执行', value: 'sync' })
  }
  items.push(
    { name: '编辑', value: 'edit' },
    { name: '删除', value: 'delete', color: '#e11d48' },
  )
  return items
})

async function loadData() {
  loading.value = true
  try {
    const [shops, setting] = await Promise.all([
      aftersalesApi.fetchShops(),
      aftersalesApi.fetchPluginSetting(),
    ])
    list.value = shops || []
    syncMinutes.value = setting.pluginSyncIntervalMin || 30
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadOnlineShops() {
  try {
    onlineShops.value = await aftersalesApi.fetchAgentOnlineShops(form.platform)
  } catch (e: any) {
    onlineShops.value = []
    showFailToast(e.message || '加载 Agents 上线店铺失败')
  }
}

function openForm(row?: MarketplaceShop) {
  form.id = row?.id || 0
  form.name = row?.name || ''
  form.platform = row?.platform || 'doudian'
  form.platformLabel = row?.platformLabel || '抖店'
  form.platformShopId = row?.platformShopId || ''
  form.platformShopName = row?.platformShopName || ''
  form.onlineShopLabel = row
    ? `${row.platformShopName || row.platformShopId || ''}`
    : ''
  form.intervalMinutes = syncMinutes.value || 30
  form.intervalLabel =
    PLUGIN_SYNC_OPTIONS.find((o) => o.value === form.intervalMinutes)?.label || '每 30 分钟'
  form.remark = row?.remark || ''
  showForm.value = true
  if (!row) {
    void loadOnlineShops()
  }
}

function openActions(row: MarketplaceShop) {
  current.value = row
  showActions.value = true
}

async function openOnlinePicker() {
  if (!onlineShops.value.length) {
    await loadOnlineShops()
  }
  showOnline.value = true
}

function onPickPlatform(act: { value?: ShopPlatform; name: string }) {
  if (!act.value) return
  form.platform = act.value
  form.platformLabel = act.name
  form.platformShopId = ''
  form.platformShopName = ''
  form.onlineShopLabel = ''
  void loadOnlineShops()
}

function onPickOnline(act: { value?: string; name: string }) {
  if (!act.value) return
  form.platformShopId = act.value
  const s = onlineShops.value.find((x) => x.platformShopId === act.value)
  form.platformShopName = s?.platformShopName || ''
  form.onlineShopLabel = act.name
  if (!form.name.trim()) {
    form.name = form.platformShopName || form.platformShopId
  }
}

function onPickInterval(act: { value?: number; name: string }) {
  if (!act.value) return
  form.intervalMinutes = act.value
  form.intervalLabel = act.name
}

async function saveShop() {
  if (!form.name.trim()) {
    showFailToast('请填写店铺名称')
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await aftersalesApi.updateShop(form.id, {
        name: form.name.trim(),
        platformShopId: form.platformShopId.trim() || undefined,
        platformShopName: form.platformShopName.trim() || undefined,
        remark: form.remark,
      })
      showSuccessToast('已更新')
    } else {
      if (!form.platformShopId.trim()) {
        showFailToast('请选择 Agents 已上线店铺')
        return
      }
      await aftersalesApi.createShopFromAgent({
        platform: form.platform,
        platformShopId: form.platformShopId.trim(),
        platformShopName: form.platformShopName.trim(),
        jobType: 'doudian.aftersale',
        name: form.name.trim(),
        intervalMinutes: form.intervalMinutes,
      })
      showSuccessToast('已创建采集并触发首次执行')
    }
    showForm.value = false
    await loadData()
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function onSaveSync(act: { value?: number }) {
  if (!act.value) return
  try {
    const setting = await aftersalesApi.savePluginSetting({ pluginSyncIntervalMin: act.value })
    syncMinutes.value = setting.pluginSyncIntervalMin
    showSuccessToast('已保存，并更新各店采集间隔')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  }
}

async function onAction(act: { value?: string }) {
  const row = current.value
  if (!row || !act.value) return
  if (act.value === 'workbench') {
    router.push(`/aftersales/shops/${row.id}`)
    return
  }
  if (act.value === 'edit') {
    openForm(row)
    return
  }
  if (act.value === 'enable') {
    try {
      await aftersalesApi.enableAgentCollect(row.id)
      showSuccessToast('已启用 Agent 采集')
      await loadData()
    } catch (e: any) {
      showFailToast(e.message || '启用失败')
    }
    return
  }
  if (act.value === 'sync') {
    try {
      await aftersalesApi.requestShopSync(row.id)
      showSuccessToast('已请求立即执行')
      await loadData()
    } catch (e: any) {
      showFailToast(e.message || '请求失败')
    }
    return
  }
  if (act.value === 'delete') {
    try {
      await showConfirmDialog({
        title: '删除店铺',
        message: `确定删除「${row.name}」及其售后数据？`,
        confirmButtonText: '删除',
        confirmButtonColor: '#e11d48',
      })
      await aftersalesApi.deleteShop(row.id)
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
@import './as-common.css';

.sync-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 4px;
  font-size: 13px;
  color: var(--ops-ink-soft);
}
.list-hint {
  margin: 0 16px 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-ink-soft);
}
.tile-count {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #be123c;
}
.pay-sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 4px 4px;
}
</style>
