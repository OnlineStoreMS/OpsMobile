<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="打印机管理" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="refresh">刷新</span>
      </template>
    </van-nav-bar>

    <div class="page-body">
      <div class="section-label">C-Lodop 云打印服务</div>
      <div class="card">
        <div class="muted tip">
          手机打开的是 HTTPS 站点，浏览器会拦截直连
          <code>http://局域网:8000</code>（混合内容）。
          因此通过网站同域代理访问 C-Lodop；下方填写打印电脑地址供服务器转发。
        </div>
        <div v-if="secure" class="proxy-box">
          <div class="proxy-box__label">当前加载方式</div>
          <code class="proxy-box__url">{{ proxyBase }}</code>
        </div>
        <van-field
          v-model="hostInput"
          label="打印电脑"
          placeholder="192.168.3.20:8000"
          clearable
          :border="false"
        />
        <div class="muted tip tip--sm">
          仅需填写局域网 IP（服务器会反代到该地址）。改 IP 后请联系运维同步
          <code>CLODOP_HTTP_UPSTREAM</code>，或保持默认 192.168.3.20:8000。
        </div>
        <div class="btn-row">
          <van-button size="small" type="primary" :loading="saving" @click="saveHost">保存并探测</van-button>
          <van-button size="small" plain hairline @click="clearHost">清除</van-button>
        </div>
        <div class="status" :class="serviceOk ? 'ok' : 'bad'">
          <van-icon :name="serviceOk ? 'passed' : 'close'" />
          <div>
            <div class="status-title">{{ serviceOk ? '服务已连通' : '服务未连通' }}</div>
            <div class="muted">{{ serviceOk ? serviceEndpoint || '已加载 CLodopfuncs.js' : serviceError || '请先探测' }}</div>
          </div>
        </div>
        <a class="dl-link" href="http://www.lodop.net/download.html" target="_blank" rel="noopener">官网下载 C-Lodop</a>
      </div>

      <div class="section-label">默认打印机</div>
      <div class="card">
        <div v-if="savedName" class="muted current">当前默认：{{ savedName }}</div>
        <van-loading v-if="loading" size="24px" vertical>读取打印机…</van-loading>
        <template v-else>
          <button
            v-for="p in printers"
            :key="p.index"
            type="button"
            class="printer-item"
            :class="{ active: selected === p.index }"
            @click="choose(p)"
          >
            <van-icon name="printer" />
            <span class="meta">
              <span class="name">{{ p.name }}</span>
              <span class="idx">索引 {{ p.index }}</span>
            </span>
            <van-tag v-if="selected === p.index" type="success" plain>已选</van-tag>
          </button>
          <van-empty
            v-if="serviceOk && !printers.length"
            image="search"
            description="未检测到打印机"
          />
          <van-empty v-else-if="!serviceOk" description="服务未连通，无法列出打印机" />
        </template>
        <div class="btn-row" v-if="serviceOk && printers.length">
          <van-button type="primary" block :loading="testing" @click="runTest">测试打印</van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import {
  ensureLocalPrintService,
  getClodopProxyBase,
  getClodopServiceBase,
  getSavedPrinterIndex,
  getSavedPrinterName,
  isSecureAppContext,
  listLocalPrinters,
  normalizeClodopServiceBase,
  resolveClodopLoadBase,
  saveClodopServiceBase,
  savePrinterSelection,
  testPrintLocalPrinter,
  type LocalPrinter,
} from '../utils/sfPrintPlugin'

const router = useRouter()
const hostInput = ref(getClodopServiceBase().replace(/^https?:\/\//i, '') || '192.168.3.20:8000')
const saving = ref(false)
const loading = ref(false)
const testing = ref(false)
const serviceOk = ref(false)
const serviceError = ref('')
const serviceEndpoint = ref('')
const printers = ref<LocalPrinter[]>([])
const selected = ref<number | null>(getSavedPrinterIndex())
const savedName = ref(getSavedPrinterName())
const secure = computed(() => isSecureAppContext())
const proxyBase = computed(() => getClodopProxyBase())

async function probeService() {
  serviceError.value = ''
  serviceEndpoint.value = ''
  try {
    await ensureLocalPrintService()
    serviceOk.value = true
    serviceEndpoint.value = resolveClodopLoadBase()
  } catch (e) {
    serviceOk.value = false
    serviceError.value = (e as Error).message || '未连通'
  }
}

async function refresh() {
  loading.value = true
  try {
    // 换地址后清掉旧脚本缓存标记，强制重载
    document.querySelectorAll('script[data-sf-print]').forEach((el) => el.remove())
    ;(window as any).getCLodop = undefined
    ;(window as any).LODOP = undefined
    ;(window as any).CLODOP = undefined

    await probeService()
    if (!serviceOk.value) {
      printers.value = []
      return
    }
    printers.value = await listLocalPrinters()
    if (selected.value != null && !printers.value.some((p) => p.index === selected.value)) {
      const byName = printers.value.find((p) => p.name === savedName.value)
      selected.value = byName?.index ?? printers.value[0]?.index ?? null
    }
    if (selected.value == null && printers.value.length === 1) {
      selected.value = printers.value[0].index
      savePrinterSelection(printers.value[0].index, printers.value[0].name)
      savedName.value = printers.value[0].name
    }
  } catch (e) {
    printers.value = []
    showFailToast((e as Error).message || '读取打印机失败')
  } finally {
    loading.value = false
  }
}

async function saveHost() {
  saving.value = true
  try {
    const normalized = normalizeClodopServiceBase(hostInput.value)
    saveClodopServiceBase(normalized)
    hostInput.value = normalized.replace(/^https?:\/\//i, '')
    await refresh()
    if (serviceOk.value) showSuccessToast('已连通')
    else showFailToast(serviceError.value || '未连通')
  } finally {
    saving.value = false
  }
}

function clearHost() {
  saveClodopServiceBase('')
  hostInput.value = ''
  serviceOk.value = false
  printers.value = []
  showSuccessToast('已清除')
}

function choose(p: LocalPrinter) {
  selected.value = p.index
  savePrinterSelection(p.index, p.name)
  savedName.value = p.name
  showSuccessToast(`已选择：${p.name}`)
}

async function runTest() {
  if (selected.value == null) {
    showFailToast('请先选择打印机')
    return
  }
  testing.value = true
  try {
    const name = printers.value.find((p) => p.index === selected.value)?.name
    savePrinterSelection(selected.value, name)
    await testPrintLocalPrinter({ printerIndex: selected.value, printerName: name })
    showSuccessToast('测试页已发送')
  } catch (e) {
    showFailToast((e as Error).message || '测试打印失败')
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  if (!getClodopServiceBase() && hostInput.value) {
    saveClodopServiceBase(normalizeClodopServiceBase(hostInput.value))
  }
  void refresh()
})
</script>

<style scoped>
.nav-link {
  color: var(--ops-primary);
  font-size: 14px;
  font-weight: 600;
}
.tip {
  margin-bottom: 8px;
  line-height: 1.5;
  font-size: 13px;
}
.tip--sm {
  font-size: 12px;
  margin-top: 4px;
}
.tip code,
.proxy-box__url {
  font-size: 12px;
  word-break: break-all;
}
.proxy-box {
  margin: 8px 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--ops-primary-soft);
}
.proxy-box__label {
  font-size: 12px;
  color: var(--ops-primary);
  font-weight: 600;
  margin-bottom: 4px;
}
.btn-row {
  display: flex;
  gap: 8px;
  margin: 8px 0 12px;
  padding: 0 4px;
}
.status {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 12px;
  margin-top: 4px;
}
.status.ok {
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}
.status.bad {
  background: rgba(225, 29, 72, 0.06);
  color: #be123c;
}
.status-title {
  font-weight: 650;
  margin-bottom: 2px;
}
.dl-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  color: var(--ops-primary);
}
.current {
  margin-bottom: 8px;
  font-size: 13px;
}
.printer-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  margin-bottom: 8px;
  border: 1px solid var(--ops-line);
  border-radius: 12px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.printer-item.active {
  border-color: var(--ops-primary);
  background: var(--ops-primary-soft);
}
.printer-item .meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.printer-item .name {
  font-weight: 600;
  color: var(--ops-text);
}
.printer-item .idx {
  font-size: 12px;
  color: var(--ops-muted);
}
</style>
