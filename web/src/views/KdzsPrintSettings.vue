<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="快递助手远程打单" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="refresh">刷新</span>
      </template>
    </van-nav-bar>

    <div class="page-body">
      <div class="section-label">说明</div>
      <div class="card">
        <div class="muted tip">
          WindowsAgent 连上 Agents 中心并上线后，具备打单能力的电脑会自动出现在下方列表。<br />
          发货页直接选在线机器与模板下发即可；切换机器也只需重选，无需配对或复制令牌。<br />
          快递助手账号在发货中心维护，下发时自动注入。
        </div>
      </div>

      <div class="section-label">默认打印机</div>
      <div class="card">
        <div class="muted tip">
          选填。填写电脑打印弹窗里的完整打印机名称（须一字不差）。不填则用弹窗当前默认。
        </div>
        <van-field
          v-model="printerName"
          label="打印机"
          placeholder="可留空"
          clearable
          maxlength="120"
        />
        <van-button block type="primary" plain :loading="savingPrinter" @click="savePrinter">
          保存打印机
        </van-button>
      </div>

      <div class="section-label">打单电脑</div>
      <div class="card">
        <van-loading v-if="loading" size="24px" vertical>加载中…</van-loading>
        <div v-else-if="!devices.length" class="muted empty">暂无机器。请确认打单电脑已运行 WindowsAgent 并连上 Agents</div>
        <div v-for="d in devices" :key="d.id" class="device-row">
          <div class="device-main">
            <div class="device-name">
              {{ d.name }}
              <span class="dot" :class="{ on: d.online }" />
              <span class="status">{{ d.online ? '在线' : '离线' }}</span>
            </div>
            <div class="muted">{{ d.machineId || d.deviceKey }}</div>
            <div v-if="d.lastSeenAt" class="muted">心跳 {{ formatTime(d.lastSeenAt) }}</div>
          </div>
        </div>
      </div>

      <div class="section-label">最近任务</div>
      <div class="card">
        <div v-if="!tasks.length" class="muted empty">暂无任务</div>
        <div v-for="t in tasks" :key="t.id" class="task-row">
          <div>#{{ t.id }} · {{ statusLabel(t.status) }}</div>
          <div class="muted">{{ formatTime(t.createdAt) }}</div>
          <div v-if="t.errorMessage" class="err">{{ t.errorMessage }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { shippingApi, type KdzsPrintDevice, type KdzsPrintTask } from '../api/shipping'
import { readKdzsPrinterName, writeKdzsPrinterName } from '../utils/kdzsPrinter'

const router = useRouter()
const loading = ref(false)
const savingPrinter = ref(false)
const devices = ref<KdzsPrintDevice[]>([])
const tasks = ref<KdzsPrintTask[]>([])
const printerName = ref(readKdzsPrinterName())
let timer: number | undefined

function formatTime(v?: string) {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  return d.toLocaleString()
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: '排队中',
    claimed: '执行中',
    done: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }
  return map[s] || s
}

async function refresh() {
  loading.value = true
  try {
    const [devs, ts] = await Promise.all([
      shippingApi.listKdzsPrintDevices(),
      shippingApi.listKdzsPrintTasks(),
    ])
    devices.value = devs.list || []
    tasks.value = ts.list || []
  } catch (e) {
    showFailToast((e as Error).message || '加载失败')
  } finally {
    loading.value = false
  }
}

function savePrinter() {
  const name = printerName.value.trim()
  savingPrinter.value = true
  try {
    writeKdzsPrinterName(name)
    printerName.value = name
    showSuccessToast(name ? '打印机已保存' : '已清空')
  } finally {
    savingPrinter.value = false
  }
}

onMounted(() => {
  void refresh()
  timer = window.setInterval(() => void refresh(), 15000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.nav-link {
  color: #0f766e;
  font-size: 14px;
}
.tip {
  margin-bottom: 4px;
  line-height: 1.55;
}
.empty {
  padding: 8px 0;
}
.device-row,
.task-row {
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}
.device-row:last-child,
.task-row:last-child {
  border-bottom: 0;
}
.device-name {
  font-weight: 650;
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
}
.dot.on {
  background: #10b981;
}
.status {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}
.err {
  color: #b91c1c;
  font-size: 12px;
  margin-top: 2px;
}
.muted {
  color: #94a3b8;
  font-size: 12px;
}
</style>
