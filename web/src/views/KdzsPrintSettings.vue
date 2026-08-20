<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="快递助手插件" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="refresh">刷新</span>
      </template>
    </van-nav-bar>

    <div class="page-body">
      <div class="section-label">绑定打单电脑</div>
      <div class="card">
        <div class="muted tip">
          1. 电脑 Chrome 扩展弹窗点「生成配对码」<br />
          2. 在下方输入电脑显示的 6 位配对码并绑定<br />
          3. 保持快递助手已登录、浏览器常开；设备显示「在线」后即可远程打单
        </div>
        <van-field
          v-model="pairCodeInput"
          type="digit"
          maxlength="6"
          label="配对码"
          placeholder="输入电脑上的 6 位码"
          clearable
        />
        <van-button block type="primary" :loading="pairing" @click="claimPair">绑定电脑</van-button>
      </div>

      <div class="section-label">默认打印机</div>
      <div class="card">
        <div class="muted tip">
          填写电脑打印弹窗里的完整打印机名称（须一字不差）。<br />
          下发打单任务时会带给扩展，自动选中后再点「打印快递单」。
        </div>
        <van-field
          v-model="printerName"
          label="打印机"
          placeholder="如 HPRT N31C"
          clearable
          maxlength="120"
        />
        <van-button block type="primary" plain :loading="savingPrinter" @click="savePrinter">
          保存打印机
        </van-button>
      </div>

      <div class="section-label">已绑定设备</div>
      <div class="card">
        <van-loading v-if="loading" size="24px" vertical>加载中…</van-loading>
        <div v-else-if="!devices.length" class="muted empty">暂无设备，请先配对</div>
        <div v-for="d in devices" :key="d.id" class="device-row">
          <div class="device-main">
            <div class="device-name">
              {{ d.name }}
              <span class="dot" :class="{ on: d.online }" />
              <span class="status">{{ d.online ? '在线' : '离线' }}</span>
            </div>
            <div class="muted">{{ d.deviceKey }}</div>
            <div v-if="d.lastSeenAt" class="muted">心跳 {{ formatTime(d.lastSeenAt) }}</div>
          </div>
          <div class="device-actions">
            <button type="button" class="link" @click="rename(d)">改名</button>
            <button type="button" class="link danger" @click="unbind(d)">解绑</button>
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
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { shippingApi, type KdzsPrintDevice, type KdzsPrintTask } from '../api/shipping'
import { readKdzsPrinterName, writeKdzsPrinterName } from '../utils/kdzsPrinter'

const router = useRouter()
const loading = ref(false)
const pairing = ref(false)
const savingPrinter = ref(false)
const devices = ref<KdzsPrintDevice[]>([])
const tasks = ref<KdzsPrintTask[]>([])
const pairCodeInput = ref('')
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

async function claimPair() {
  const code = pairCodeInput.value.trim()
  if (code.length < 4) {
    showFailToast('请输入电脑上的配对码')
    return
  }
  pairing.value = true
  try {
    const d = await shippingApi.claimKdzsPrintPair(code)
    pairCodeInput.value = ''
    showSuccessToast(`已绑定「${d.name}」`)
    await refresh()
  } catch (e) {
    showFailToast((e as Error).message || '绑定失败')
  } finally {
    pairing.value = false
  }
}

function savePrinter() {
  const name = printerName.value.trim()
  if (!name) {
    showFailToast('请填写完整打印机名称')
    return
  }
  savingPrinter.value = true
  try {
    writeKdzsPrinterName(name)
    printerName.value = name
    showSuccessToast('打印机已保存')
  } finally {
    savingPrinter.value = false
  }
}

async function rename(d: KdzsPrintDevice) {
  const name = window.prompt('设备名称', d.name)
  if (!name?.trim()) return
  try {
    await shippingApi.renameKdzsPrintDevice(d.id, name.trim())
    showSuccessToast('已改名')
    await refresh()
  } catch (e) {
    showFailToast((e as Error).message || '改名失败')
  }
}

async function unbind(d: KdzsPrintDevice) {
  try {
    await showConfirmDialog({ title: '解绑设备', message: `确定解绑「${d.name}」？` })
  } catch {
    return
  }
  try {
    await shippingApi.unbindKdzsPrintDevice(d.id)
    showSuccessToast('已解绑')
    await refresh()
  } catch (e) {
    showFailToast((e as Error).message || '解绑失败')
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
  margin-bottom: 12px;
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
.device-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
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
.device-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.link {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  padding: 0;
}
.link.danger {
  color: #dc2626;
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
