<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="任务" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="openCreate">新建</span>
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="tab" @change="onTabChange">
      <van-tab title="订阅" name="assignments" />
      <van-tab title="执行记录" name="runs" />
    </van-tabs>

    <div v-if="tab === 'runs'" class="filter-bar">
      <van-dropdown-menu>
        <van-dropdown-item v-model="status" :options="statusOptions" @change="reloadRuns" />
      </van-dropdown-menu>
    </div>

    <div class="list-shell">
      <van-list
        v-if="tab === 'assignments'"
        :loading="assignLoading"
        :finished="true"
        finished-text=""
      >
        <div v-for="row in assignments" :key="row.id" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.jobTypeName || row.jobType }}</div>
            <van-tag plain :type="row.enabled ? 'success' : 'default'">
              {{ row.enabled ? '启用' : '停用' }}
            </van-tag>
          </div>
          <div class="muted">{{ row.platformShopName || row.platformShopId }}</div>
          <div class="muted">
            {{ policyLabel(row.runPolicy) }}
            <template v-if="row.runPolicy === 'interval' && row.intervalMinutes"> · {{ row.intervalMinutes }} 分</template>
          </div>
          <div class="muted">下次 {{ formatTime(row.nextRunAt || undefined) }}</div>
          <div class="card-actions">
            <van-button size="small" type="primary" plain @click="onTrigger(row)">立即执行</van-button>
            <van-button size="small" plain @click="onToggle(row)">{{ row.enabled ? '停用' : '启用' }}</van-button>
          </div>
        </div>
        <van-empty v-if="!assignLoading && !assignments.length" description="暂无任务订阅" />
      </van-list>

      <van-list v-else :loading="loading" :finished="true" finished-text="">
        <p class="list-hint">每次触发会产生一条记录，不是新建任务。</p>
        <div v-for="row in runs" :key="row.id" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.jobType }}</div>
            <van-tag plain :type="jobStatusType(row.status)">{{ jobStatusLabel(row.status) }}</van-tag>
          </div>
          <div class="muted">{{ row.platformShopName || row.platformShopId }}</div>
          <div class="muted">节点 {{ row.agentName || '—' }} · {{ row.source || '—' }}</div>
          <div class="muted">创建 {{ formatTime(row.createdAt) }}</div>
          <div v-if="row.errorMessage" class="err">{{ row.errorMessage }}</div>
        </div>
        <van-empty v-if="!loading && !runs.length" description="暂无执行记录" />
      </van-list>
    </div>

    <van-popup v-model:show="dialog" position="bottom" round :style="{ maxHeight: '88%' }">
      <div class="sheet">
        <div class="sheet-title">新建任务订阅</div>
        <van-cell-group inset>
          <van-field label="任务类型" :model-value="skillName" readonly is-link @click="showSkill = true" />
          <van-field
            label="店铺"
            :model-value="shopName"
            readonly
            is-link
            placeholder="选择已上报店铺"
            @click="showShop = true"
          />
          <van-field v-if="needsOrderNo" v-model="form.orderNo" label="订单号" placeholder="抖店订单号" />
          <van-field v-if="supportsInterval && form.runPolicy === 'interval'" v-model="intervalText" type="digit" label="间隔分钟" />
        </van-cell-group>
        <div v-if="supportsInterval" class="switch-row">
          <span>定时间隔</span>
          <van-switch :model-value="form.runPolicy === 'interval'" @update:model-value="onPolicy" />
        </div>
        <div class="switch-row">
          <span>保存后立即执行</span>
          <van-switch v-model="form.triggerNow" />
        </div>
        <p v-if="form.jobType === 'doudian.aftersale'" class="list-hint">
          售后抓取参数由售后中心写入；定时也由售后中心触发。
        </p>
        <div class="sheet-actions">
          <van-button block @click="dialog = false">取消</van-button>
          <van-button block type="primary" :loading="saving" @click="submit">保存</van-button>
        </div>
      </div>
    </van-popup>

    <van-action-sheet v-model:show="showSkill" :actions="skillActions" cancel-text="取消" @select="pickSkill" />
    <van-action-sheet v-model:show="showShop" :actions="shopActions" cancel-text="取消" @select="pickShop" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  agentsApi,
  jobStatusLabel,
  jobStatusType,
  policyLabel,
  type AssignmentItem,
  type JobItem,
  type ShopItem,
  type SkillItem,
} from '../../api/agents'
import { formatTime } from '../../utils/labels'

const router = useRouter()
const route = useRoute()
const tab = ref(route.query.tab === 'runs' ? 'runs' : 'assignments')
const loading = ref(false)
const assignLoading = ref(false)
const saving = ref(false)
const assignments = ref<AssignmentItem[]>([])
const runs = ref<JobItem[]>([])
const status = ref(typeof route.query.status === 'string' ? route.query.status : '')
const skills = ref<SkillItem[]>([])
const shops = ref<ShopItem[]>([])
const dialog = ref(false)
const showSkill = ref(false)
const showShop = ref(false)

const form = reactive({
  jobType: 'doudian.aftersale',
  platform: 'doudian',
  platformShopId: '',
  platformShopName: '',
  orderNo: '',
  browserChannel: '',
  runPolicy: 'interval',
  intervalMinutes: 30,
  triggerNow: true,
})

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待分配', value: 'pending' },
  { text: '已领取', value: 'claimed' },
  { text: '执行中', value: 'running' },
  { text: '成功', value: 'succeeded' },
  { text: '失败', value: 'failed' },
  { text: '已取消', value: 'cancelled' },
]

const selectedSkill = computed(() => skills.value.find((s) => s.id === form.jobType))
const supportsInterval = computed(() => (selectedSkill.value?.runPolicies || []).includes('interval'))
const needsOrderNo = computed(() => form.jobType === 'doudian.order.decrypt-phone')
const skillName = computed(() => selectedSkill.value?.name || form.jobType)
const shopName = computed(() => form.platformShopName || form.platformShopId)
const intervalText = computed({
  get: () => String(form.intervalMinutes),
  set: (v: string) => {
    form.intervalMinutes = Math.max(5, Number(v) || 30)
  },
})
const skillActions = computed(() => skills.value.map((s) => ({ name: `${s.name}（${s.id}）`, value: s.id })))
const shopActions = computed(() =>
  shops.value
    .filter((s) => s.platform === form.platform)
    .map((s) => ({
      name: `${s.platformShopName || s.platformShopId}${s.agentOnline ? '' : ' · 离线'}`,
      value: s.platformShopId,
      subname: s.platformShopId,
    })),
)

function onPolicy(on: boolean) {
  form.runPolicy = on ? 'interval' : 'on_demand'
}

function applySkillDefaults(jobType: string) {
  const skill = skills.value.find((s) => s.id === jobType)
  if (!skill) return
  if ((skill.runPolicies || []).includes('interval')) {
    form.runPolicy = 'interval'
    form.intervalMinutes = skill.defaultIntervalMinutes || 30
  } else {
    form.runPolicy = 'on_demand'
  }
}

async function loadAssignments() {
  assignLoading.value = true
  try {
    const res = await agentsApi.listAssignments({ page: 1, pageSize: 100 })
    assignments.value = res.list || []
  } catch (e: any) {
    showFailToast(e?.message || '加载订阅失败')
  } finally {
    assignLoading.value = false
  }
}

async function loadRuns() {
  loading.value = true
  try {
    const res = await agentsApi.listJobs({
      page: 1,
      pageSize: 50,
      status: status.value || undefined,
    })
    runs.value = res.list || []
  } catch (e: any) {
    showFailToast(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reloadRuns() {
  void loadRuns()
}

function onTabChange() {
  if (tab.value === 'assignments') void loadAssignments()
  else void loadRuns()
}

async function openCreate() {
  try {
    const [sk, sh] = await Promise.all([
      agentsApi.listSkills(),
      agentsApi.listShops({ page: 1, pageSize: 200 }),
    ])
    skills.value = sk || []
    shops.value = sh?.list || []
  } catch {
    skills.value = []
    shops.value = []
  }
  form.jobType = skills.value[0]?.id || 'doudian.aftersale'
  applySkillDefaults(form.jobType)
  form.platform = skills.value[0]?.platform || 'doudian'
  form.platformShopId = ''
  form.platformShopName = ''
  form.orderNo = ''
  form.browserChannel = ''
  form.triggerNow = true
  dialog.value = true
}

function pickSkill(act: { value?: string }) {
  if (!act.value) return
  form.jobType = act.value
  const skill = skills.value.find((s) => s.id === act.value)
  if (skill?.platform) form.platform = skill.platform
  applySkillDefaults(act.value)
}

function pickShop(act: { value?: string }) {
  if (!act.value) return
  const shop = shops.value.find((s) => s.platformShopId === act.value && s.platform === form.platform)
  form.platformShopId = act.value
  form.platformShopName = shop?.platformShopName || ''
  form.browserChannel = shop?.browserChannel || ''
}

async function submit() {
  if (!form.platformShopId) {
    showFailToast('请选择店铺')
    return
  }
  if (needsOrderNo.value && !form.orderNo.trim()) {
    showFailToast('请填写订单号')
    return
  }
  let paramsJson = JSON.stringify({
    browserChannel: form.browserChannel || '',
  })
  if (form.jobType === 'doudian.order.decrypt-phone') {
    paramsJson = JSON.stringify({
      orderNo: form.orderNo.trim(),
      browserChannel: form.browserChannel || 'msedge',
    })
  }
  const runPolicy = supportsInterval.value ? form.runPolicy : 'on_demand'
  saving.value = true
  try {
    await agentsApi.upsertAssignment({
      jobType: form.jobType,
      platform: form.platform,
      platformShopId: form.platformShopId,
      platformShopName: form.platformShopName,
      enabled: true,
      runPolicy,
      intervalMinutes: runPolicy === 'interval' ? form.intervalMinutes : undefined,
      triggerNow: form.triggerNow,
      paramsJson,
      source: 'manual',
      priority: 100,
    })
    showSuccessToast(form.triggerNow ? '已保存并下发' : '已保存订阅')
    dialog.value = false
    tab.value = form.triggerNow ? 'runs' : 'assignments'
    if (form.triggerNow) await loadRuns()
    else await loadAssignments()
  } catch (e: any) {
    showFailToast(e?.message || '创建失败')
  } finally {
    saving.value = false
  }
}

async function onTrigger(row: AssignmentItem) {
  try {
    await agentsApi.triggerAssignment(row.id, { source: 'manual' })
    showSuccessToast('已下发执行单')
    tab.value = 'runs'
    await loadRuns()
  } catch (e: any) {
    showFailToast(e?.message || '下发失败')
  }
}

async function onToggle(row: AssignmentItem) {
  try {
    await agentsApi.setAssignmentEnabled(row.id, !row.enabled)
    showSuccessToast(row.enabled ? '已停用' : '已启用')
    await loadAssignments()
  } catch (e: any) {
    showFailToast(e?.message || '操作失败')
  }
}

watch(tab, () => {
  router.replace({ path: '/agents/jobs', query: { tab: tab.value, ...(status.value ? { status: status.value } : {}) } })
})

onMounted(() => {
  if (tab.value === 'runs') void loadRuns()
  else void loadAssignments()
})
</script>

<style scoped>
.filter-bar :deep(.van-dropdown-menu) {
  box-shadow: none;
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
.err {
  margin-top: 8px;
  font-size: 12px;
  color: #e11d48;
}
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--ops-line);
}
.sheet {
  padding: 16px 0 calc(16px + env(safe-area-inset-bottom));
}
.sheet-title {
  font-size: 16px;
  font-weight: 650;
  padding: 0 16px 12px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 16px 0;
  font-size: 14px;
}
.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 16px;
}
</style>
