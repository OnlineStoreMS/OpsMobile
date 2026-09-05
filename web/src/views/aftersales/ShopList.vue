<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="店铺列表" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openForm()">添加</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <div class="sync-bar">
        <span>插件自动同步</span>
        <button type="button" class="status-chip" @click="showSync = true">
          {{ syncLabel }}
        </button>
      </div>
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
          <div class="muted">{{ row.platformLabel }}<template v-if="row.platformShopName"> · {{ row.platformShopName }}</template></div>
          <div class="muted">绑定码 {{ row.bindCode }}</div>
          <div class="muted">最近同步 {{ formatTime(row.lastSyncAt) || '—' }}</div>
          <div class="muted">下次同步 {{ formatTime(row.nextSyncAt) || '—' }}</div>
          <div v-if="row.syncRequested" class="tone-warning">已请求同步，等待插件心跳</div>
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
        <div class="sheet-title">{{ form.id ? '编辑店铺' : '添加店铺' }}</div>
        <van-field v-model="form.name" label="名称" required placeholder="店铺名称" />
        <van-field
          v-model="form.platformLabel"
          label="平台"
          readonly
          :disabled="!!form.id"
          :is-link="!form.id"
          @click="!form.id && (showPlatform = true)"
        />
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
  type MarketplaceShop,
  type ShopPlatform,
} from '../../api/aftersales'
import { formatTime } from '../../utils/ticketLogistics'

const router = useRouter()
const list = ref<MarketplaceShop[]>([])
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const showActions = ref(false)
const showSync = ref(false)
const showPlatform = ref(false)
const current = ref<MarketplaceShop | null>(null)
const syncMinutes = ref(30)
const form = reactive({
  id: 0,
  name: '',
  platform: 'doudian' as ShopPlatform,
  platformLabel: '抖店',
  remark: '',
})

const syncLabel = computed(
  () => PLUGIN_SYNC_OPTIONS.find((o) => o.value === syncMinutes.value)?.label || '每 30 分钟',
)
const syncActions = PLUGIN_SYNC_OPTIONS.map((o) => ({ name: o.label, value: o.value }))
const platformActions = PLATFORM_OPTIONS.map((o) => ({ name: o.label, value: o.value }))
const actions = computed(() => [
  { name: '打开工作台', value: 'workbench' },
  { name: '请求同步', value: 'sync' },
  { name: '复制绑定码', value: 'copy' },
  { name: '编辑', value: 'edit' },
  { name: '重置绑定', value: 'reset', color: '#ea580c' },
  { name: '删除', value: 'delete', color: '#e11d48' },
])

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

function openForm(row?: MarketplaceShop) {
  form.id = row?.id || 0
  form.name = row?.name || ''
  form.platform = row?.platform || 'doudian'
  form.platformLabel = row?.platformLabel || '抖店'
  form.remark = row?.remark || ''
  showForm.value = true
}

function openActions(row: MarketplaceShop) {
  current.value = row
  showActions.value = true
}

function onPickPlatform(act: { value?: ShopPlatform; name: string }) {
  if (!act.value) return
  form.platform = act.value
  form.platformLabel = act.name
}

async function saveShop() {
  if (!form.name.trim()) {
    showFailToast('请填写店铺名称')
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await aftersalesApi.updateShop(form.id, { name: form.name.trim(), remark: form.remark })
      showSuccessToast('已更新')
    } else {
      const shop = await aftersalesApi.createShop({
        name: form.name.trim(),
        platform: form.platform,
        remark: form.remark,
      })
      showSuccessToast(shop.pluginAvailable ? '已添加，请复制绑定码' : '已添加')
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
    showSuccessToast('已保存同步间隔')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    showSuccessToast('已复制')
  } catch {
    showSuccessToast(text)
  }
}

async function onAction(act: { value?: string }) {
  const row = current.value
  if (!row || !act.value) return
  if (act.value === 'workbench') {
    router.push(`/aftersales/shops/${row.id}`)
    return
  }
  if (act.value === 'copy') {
    await copyText(row.bindCode)
    return
  }
  if (act.value === 'edit') {
    openForm(row)
    return
  }
  if (act.value === 'sync') {
    try {
      await aftersalesApi.requestShopSync(row.id)
      showSuccessToast('已请求同步，约 1 分钟内采集')
      await loadData()
    } catch (e: any) {
      showFailToast(e.message || '请求失败')
    }
    return
  }
  if (act.value === 'reset') {
    try {
      await showConfirmDialog({
        title: '重置绑定码',
        message: '原插件密钥会立即失效，需要重新填写绑定码。',
        confirmButtonText: '重置',
      })
      const shop = await aftersalesApi.resetShopBind(row.id)
      showSuccessToast(`新绑定码 ${shop.bindCode}`)
      await loadData()
    } catch (e: any) {
      if (e !== 'cancel') showFailToast(e.message || '重置失败')
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
