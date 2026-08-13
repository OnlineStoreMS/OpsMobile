/** 顺丰云打印插件：OAuth2 accessToken + SCPPrint.js（官方 COM_RECE_CLOUD_PRINT_PARSEDDATA 方案） */

export interface SFPluginPrintPayload {
  partnerId: string
  env: string // sbox | pro
  templateCode: string
  mailNo: string
  requestId?: string
  accessToken?: string
  obj?: unknown
  files?: unknown
  customTemplateCode?: string
  /** 后端拼好的托寄物/商品备注，写入 documents.remark */
  labelRemark?: string
  sdkPrintData?: {
    requestID: string
    templateCode: string
    customTemplateCode?: string
    documents: Array<Record<string, string>>
    accessToken?: string
    extJson?: Record<string, unknown>
  }
}

export type LocalPrinter = { index: number; name: string }

const PRINTER_STORAGE_KEY = 'opsmobile.clodop.printerIndex'
const PRINTER_NAME_STORAGE_KEY = 'opsmobile.clodop.printerName'
/** 条码标签机（可与面单默认机不同） */
const BARCODE_PRINTER_INDEX_KEY = 'opsmobile.clodop.barcodePrinterIndex'
const BARCODE_PRINTER_NAME_KEY = 'opsmobile.clodop.barcodePrinterName'
/** 局域网 C-Lodop 服务根地址，如 http://192.168.3.10:8000 */
const SERVICE_BASE_KEY = 'opsmobile.clodop.serviceBase'

export function getClodopServiceBase(): string {
  return (localStorage.getItem(SERVICE_BASE_KEY) || '').trim().replace(/\/+$/, '')
}

export function saveClodopServiceBase(base: string) {
  const v = base.trim().replace(/\/+$/, '')
  if (v) localStorage.setItem(SERVICE_BASE_KEY, v)
  else localStorage.removeItem(SERVICE_BASE_KEY)
}

/** 规范化用户输入的主机/URL → http(s)://host:port */
export function normalizeClodopServiceBase(input: string): string {
  let s = input.trim().replace(/\/+$/, '')
  if (!s) return ''
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`
  try {
    const u = new URL(s)
    if (!u.port) u.port = '8000'
    return `${u.protocol}//${u.host}`
  } catch {
    return s
  }
}

/**
 * 同域反代地址（HTTPS 站点专用）。
 * 浏览器禁止 https 页面加载 http://局域网:8000 脚本（混合内容），
 * 因此经 Caddy `/apps/ops-m/clodop/` 转到 C-Lodop。
 */
export function getClodopProxyBase(): string {
  const appBase = (import.meta.env.BASE_URL || '/apps/ops-m/').replace(/\/?$/, '/')
  if (typeof window === 'undefined') return `${appBase}clodop`
  return `${window.location.origin}${appBase}clodop`
}

export function isSecureAppContext(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
}

/** 当前应优先使用的 C-Lodop 根地址（HTTPS 下强制走同域反代） */
export function resolveClodopLoadBase(): string {
  if (isSecureAppContext()) return getClodopProxyBase()
  return getClodopServiceBase() || getClodopProxyBase()
}

function patchLodopHostURI(LODOP: LodopInstance, base: string) {
  const uri = base.replace(/\/+$/, '')
  try {
    LODOP.strHostURI = uri
  } catch {
    /* ignore */
  }
  // 部分版本挂在全局 CLODOP
  try {
    if (window.CLODOP && typeof window.CLODOP === 'object') {
      ;(window.CLODOP as LodopInstance).strHostURI = uri
    }
  } catch {
    /* ignore */
  }
}

/**
 * CLodopfuncs.js 生成时写死了 `new WebSocket('ws://192.168.x.x:8000/c_webskt/')`，
 * HTTPS 页无法直连 ws://局域网。在加载脚本前劫持 WebSocket，改走同域 wss 反代。
 */
let wsShimInstalled = false
function installClodopWebSocketShim() {
  if (wsShimInstalled || typeof window === 'undefined') return
  if (!isSecureAppContext()) return
  wsShimInstalled = true

  const Orig = window.WebSocket
  const rewrite = (url: string | URL): string => {
    const s = String(url)
    // 本机回环仍直连（电脑调试）
    if (/^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return s
    const isClodopWs =
      /c_webskt/i.test(s) ||
      /:(8000|18000|8443)(\/|$)/.test(s) ||
      /^wss?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(s)
    if (!isClodopWs) return s
    const proxy = getClodopProxyBase().replace(/\/+$/, '')
    const wsBase = proxy.replace(/^http/i, 'ws') // https→wss / http→ws
    return `${wsBase}/c_webskt/`
  }

  const Patched = function (this: WebSocket, url: string | URL, protocols?: string | string[]) {
    const next = rewrite(url)
    return protocols !== undefined ? new Orig(next, protocols) : new Orig(next)
  } as unknown as typeof WebSocket

  Patched.prototype = Orig.prototype
  Object.defineProperty(Patched, 'CONNECTING', { value: Orig.CONNECTING })
  Object.defineProperty(Patched, 'OPEN', { value: Orig.OPEN })
  Object.defineProperty(Patched, 'CLOSING', { value: Orig.CLOSING })
  Object.defineProperty(Patched, 'CLOSED', { value: Orig.CLOSED })
  window.WebSocket = Patched
}

type LodopInstance = {
  strHostURI?: string
  webskt?: { readyState?: number; close?: () => void }
  OpenWebSocket?: () => void
  PRINT_INIT: (title: string) => void
  SET_PRINT_PAGESIZE: (intOrient: number, pageWidth: number | string, pageHeight: number | string, pageName: string) => void
  ADD_PRINT_PDF: (top: number | string, left: number | string, width: number | string, height: number | string, data: string) => void
  ADD_PRINT_TEXT?: (
    top: number | string,
    left: number | string,
    width: number | string,
    height: number | string,
    text: string,
  ) => void
  ADD_PRINT_BARCODE?: (
    top: number | string,
    left: number | string,
    width: number | string,
    height: number | string,
    barCodeType: string,
    barCodeValue: string,
  ) => void
  ADD_PRINT_IMAGE?: (
    top: number | string,
    left: number | string,
    width: number | string,
    height: number | string,
    imgFile: string,
  ) => void
  ADD_PRINT_URL?: (top: number | string, left: number | string, width: number | string, height: number | string, url: string) => void
  SET_PRINT_MODE?: (mode: string, value: string | number | boolean) => void
  SET_PRINT_STYLE?: (styleName: string, value: string | number) => void
  SET_PRINT_STYLEA?: (itemIndex: number | string, styleName: string, value: string | number) => void
  SET_PRINTER_INDEX?: (index: number | string) => void | boolean
  SET_PRINTER_INDEXA?: (indexOrName: number | string) => void | boolean
  GET_PRINTER_COUNT?: () => number
  GET_PRINTER_NAME?: (index: number) => string
  NewPage?: () => void
  PRINT: () => void | boolean
  PREVIEW: () => void
}

type SCPPrintInstance = {
  getPrinters: (cb: (result: { code: number; printers?: Array<{ name: string; index: number }> }) => void) => void
  setPrinter: (index: number | string) => void
  print: (
    data: Record<string, unknown>,
    callback: (result: unknown) => void,
    options?: { lodopFn?: string },
  ) => void
}

declare global {
  interface Window {
    SCPPrint?: new (params: Record<string, unknown>) => SCPPrintInstance
    getCLodop?: () => LodopInstance
    LODOP?: LodopInstance
    CLODOP?: LodopInstance
  }
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existed = document.querySelector(`script[data-sf-print="${src}"]`) as HTMLScriptElement | null
    if (existed) {
      if ((existed as HTMLScriptElement & { dataset: { loaded?: string } }).dataset.loaded === '1') {
        resolve()
        return
      }
      existed.addEventListener('load', () => resolve(), { once: true })
      existed.addEventListener('error', () => reject(new Error(src)), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.dataset.sfPrint = src
    s.onload = () => {
      s.dataset.loaded = '1'
      resolve()
    }
    s.onerror = () => reject(new Error(`加载失败: ${src}`))
    document.head.appendChild(s)
  })
}

/** 安装 C-Lodop 后本机一般会起 Web 打印服务（8000 / 18000 / 8443） */
function getLodopIfReady(): LodopInstance | null {
  const getter = window.getCLodop
  if (typeof getter === 'function') {
    try {
      return getter()
    } catch {
      return null
    }
  }
  return window.LODOP || window.CLODOP || null
}

function buildLodopCandidates(): string[] {
  const list: string[] = []
  const primary = resolveClodopLoadBase()
  if (primary) {
    list.push(`${primary}/CLodopfuncs.js?priority=1`)
  }
  // HTTPS 页不要再尝试局域网 http（会被浏览器直接拦截，徒增报错）
  if (!isSecureAppContext()) {
    const base = getClodopServiceBase()
    if (base && base !== primary) {
      list.push(`${base}/CLodopfuncs.js?priority=1`)
      try {
        const u = new URL(base)
        const host = u.hostname
        if (u.port === '8000' || !u.port) {
          list.push(`${u.protocol}//${host}:18000/CLodopfuncs.js?priority=0`)
        }
      } catch {
        /* ignore */
      }
    }
    list.push(
      'http://localhost:8000/CLodopfuncs.js?priority=1',
      'http://127.0.0.1:8000/CLodopfuncs.js?priority=1',
      'http://localhost:18000/CLodopfuncs.js?priority=0',
    )
  }
  return [...new Set(list)]
}

export async function ensureLocalPrintService(): Promise<LodopInstance> {
  installClodopWebSocketShim()
  const loadBase = resolveClodopLoadBase()
  const ready = getLodopIfReady()
  if (ready) {
    patchLodopHostURI(ready, loadBase)
    await ensureLodopWebSocket(ready)
    return ready
  }

  const candidates = buildLodopCandidates()
  const results = await Promise.allSettled(candidates.map((u) => loadScript(u)))
  await wait(400)

  const again = getLodopIfReady()
  if (again) {
    patchLodopHostURI(again, loadBase)
    await ensureLodopWebSocket(again)
    return again
  }

  const failedAll = results.every((r) => r.status === 'rejected')
  if (isSecureAppContext()) {
    throw new Error(
      failedAll
        ? `无法经网站代理加载 C-Lodop（${loadBase}）。请确认：1) 打印电脑已启动 C-Lodop；2) 服务器能访问局域网 C-Lodop；3) 已配置 CLODOP_HTTP_UPSTREAM。`
        : `已加载脚本但未就绪。请刷新后重试；仍失败则检查 Caddy 反代 /apps/ops-m/clodop/ → C-Lodop。`,
    )
  }
  const configured = getClodopServiceBase()
  throw new Error(
    configured
      ? `无法连接 C-Lodop（${configured}）。请确认 Windows 已启动 C-Lodop，且本机可访问该地址。`
      : '未配置 C-Lodop 服务地址。请到「打印机管理」填写局域网中 Windows 主机的 IP。',
  )
}

/** 等待 / 重连 C-Lodop WebSocket（打印指令依赖它） */
async function ensureLodopWebSocket(LODOP: LodopInstance, timeoutMs = 10000) {
  let lastOpen = 0
  const tryOpen = () => {
    try {
      if (LODOP.webskt && LODOP.webskt.readyState !== 1) {
        try {
          LODOP.webskt.close?.()
        } catch {
          /* ignore */
        }
        LODOP.webskt = undefined
      }
      LODOP.OpenWebSocket?.()
      lastOpen = Date.now()
    } catch {
      /* ignore */
    }
  }
  tryOpen()
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (LODOP.webskt?.readyState === 1) return
    if (Date.now() - lastOpen >= 2000) tryOpen()
    await wait(200)
  }
  if (isSecureAppContext()) {
    throw new Error(
      'C-Lodop WebSocket 未就绪。已通过网站代理加载脚本，但 wss 通道未接通；请确认 Caddy 反代支持 /apps/ops-m/clodop/c_webskt/，且打印电脑 C-Lodop 在线。',
    )
  }
}

/**
 * 加载官方 SCPPrint.js（需放在 web/public/sf/SCPPrint.js）。
 * 从丰桥文档页「另存为」下载：云打印面单打印插件接口 COM_RECE_CLOUD_PRINT_PARSEDDATA。
 */
export async function ensureSCPPrintSDK(): Promise<void> {
  if (window.SCPPrint) return
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')
  // 本地优先；CDN 为丰桥文档公布的 lodop/2.7
  const candidates = [
    `${base}sf/SCPPrint.js`,
    '/sf/SCPPrint.js',
    'https://scp-tcdn.sf-express.com/prd/sdk/lodop/2.7/SCPPrint.js',
  ]
  for (const src of candidates) {
    try {
      await loadScript(src)
      await wait(50)
      if (window.SCPPrint) return
    } catch {
      /* try next */
    }
  }
  throw new Error('SCPPRINT_SDK_MISSING')
}

export function getSavedPrinterIndex(): number | null {
  const v = localStorage.getItem(PRINTER_STORAGE_KEY)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function getSavedPrinterName(): string {
  return localStorage.getItem(PRINTER_NAME_STORAGE_KEY) || ''
}

export function savePrinterSelection(index: number, name?: string) {
  localStorage.setItem(PRINTER_STORAGE_KEY, String(index))
  if (name != null && name !== '') {
    localStorage.setItem(PRINTER_NAME_STORAGE_KEY, name)
  }
}

/** 条码标签上次选用的打印机（与面单默认机分开记） */
export function getSavedBarcodePrinterIndex(): number | null {
  const v = localStorage.getItem(BARCODE_PRINTER_INDEX_KEY)
  if (v === null || v === '') return getSavedPrinterIndex()
  const n = Number(v)
  return Number.isFinite(n) ? n : getSavedPrinterIndex()
}

export function getSavedBarcodePrinterName(): string {
  return localStorage.getItem(BARCODE_PRINTER_NAME_KEY) || getSavedPrinterName()
}

export function saveBarcodePrinterSelection(index: number, name?: string) {
  localStorage.setItem(BARCODE_PRINTER_INDEX_KEY, String(index))
  if (name != null && name !== '') {
    localStorage.setItem(BARCODE_PRINTER_NAME_KEY, name)
  }
}

/** @deprecated 使用 savePrinterSelection */
export function savePrinterIndex(index: number) {
  savePrinterSelection(index)
}

function applyPrinterIndex(LODOP: LodopInstance, printerIndex: number) {
  try {
    if (typeof LODOP.SET_PRINTER_INDEXA === 'function') {
      LODOP.SET_PRINTER_INDEXA(printerIndex)
      return
    }
    if (typeof LODOP.SET_PRINTER_INDEX === 'function') {
      LODOP.SET_PRINTER_INDEX(printerIndex)
    }
  } catch {
    /* ignore */
  }
}

/** 列出本机 C-Lodop 打印机（浏览器所在电脑） */
export async function listLocalPrinters(): Promise<LocalPrinter[]> {
  const LODOP = await ensureLocalPrintService()
  const count = typeof LODOP.GET_PRINTER_COUNT === 'function' ? LODOP.GET_PRINTER_COUNT() : 0
  const list: LocalPrinter[] = []
  for (let i = 0; i < count; i++) {
    const name =
      (typeof LODOP.GET_PRINTER_NAME === 'function' && LODOP.GET_PRINTER_NAME(i)) || `打印机 ${i}`
    list.push({ index: i, name: String(name) })
  }
  if (list.length > 0) return list

  // Lodop 未暴露枚举时，尝试 SCPPrint
  try {
    await ensureSCPPrintSDK()
    if (!window.SCPPrint) return list
    const sdk = new window.SCPPrint({ env: 'sbox', partnerID: 'probe', notips: true, callback: () => {} })
    const viaSdk = await new Promise<LocalPrinter[]>((resolve) => {
      const timer = window.setTimeout(() => resolve([]), 4000)
      sdk.getPrinters((result) => {
        window.clearTimeout(timer)
        if (result.code === 1 && result.printers?.length) {
          resolve(result.printers.map((p) => ({ index: p.index, name: p.name })))
          return
        }
        resolve([])
      })
    })
    return viaSdk
  } catch {
    return list
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

/** 用本机 C-Lodop 打印 PDF */
export async function printPDFWithLocalService(
  pdfBlob: Blob,
  opts?: { preview?: boolean; title?: string; printerIndex?: number | null },
) {
  const LODOP = await ensureLocalPrintService()
  const base64 = await blobToBase64(pdfBlob)
  LODOP.PRINT_INIT(opts?.title || '顺丰面单')
  const printerIndex = opts?.printerIndex ?? getSavedPrinterIndex()
  if (printerIndex != null) {
    applyPrinterIndex(LODOP, printerIndex)
  }
  try {
    LODOP.SET_PRINT_PAGESIZE(1, '76mm', '130mm', '')
  } catch {
    /* ignore */
  }
  LODOP.ADD_PRINT_PDF(0, 0, '100%', '100%', base64)
  if (opts?.preview) {
    LODOP.PREVIEW()
  } else {
    LODOP.PRINT()
  }
  await wait(300)
}

/** 官方插件打印：SCPPrint.print({ accessToken, templateCode, documents }) */
export async function printWithSFPlugin(
  payload: SFPluginPrintPayload,
  opts?: { preview?: boolean; printerIndex?: number | null },
) {
  try {
    await ensureLocalPrintService()
  } catch (e) {
    throw e
  }

  try {
    await ensureSCPPrintSDK()
  } catch {
    throw new Error('SCPPRINT_SDK_MISSING')
  }

  if (!window.SCPPrint) {
    throw new Error('SCPPRINT_SDK_MISSING')
  }

  const accessToken = payload.accessToken || payload.sdkPrintData?.accessToken
  if (!accessToken) {
    throw new Error('缺少丰桥 accessToken，请检查顾客编码/校验码/环境后重试')
  }

  const env = payload.env === 'pro' || payload.env === 'prod' ? 'pro' : 'sbox'
  const printSdk = new window.SCPPrint({
    env,
    partnerID: payload.partnerId,
    notips: false,
    callback: () => {},
  })

  const printerIndex = opts?.printerIndex ?? getSavedPrinterIndex()
  if (printerIndex == null) {
    throw new Error('PRINTER_NOT_SELECTED')
  }
  printSdk.setPrinter(printerIndex)

  const docs =
    payload.sdkPrintData?.documents ||
    ([
      {
        masterWaybillNo: payload.mailNo,
        ...(payload.labelRemark
          ? {
              remark: payload.labelRemark,
              cargoDesc: payload.labelRemark,
              goods: payload.labelRemark,
              product: payload.labelRemark,
            }
          : {}),
      },
    ] as Array<Record<string, string>>)
  const data: Record<string, unknown> = {
    requestID: payload.sdkPrintData?.requestID || payload.requestId || `SC-${Date.now()}`,
    accessToken,
    templateCode: payload.sdkPrintData?.templateCode || payload.templateCode,
    documents: docs,
  }
  const customTpl =
    payload.sdkPrintData?.customTemplateCode || payload.customTemplateCode
  if (customTpl) {
    data.customTemplateCode = customTpl
  }
  const extJson = (payload.sdkPrintData as { extJson?: Record<string, unknown> } | undefined)?.extJson
  if (extJson) {
    data.extJson = extJson
  } else if (payload.labelRemark) {
    data.extJson = {
      remark: payload.labelRemark,
      cargoDesc: payload.labelRemark,
      goods: payload.labelRemark,
      product: payload.labelRemark,
    }
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('插件打印超时')), 20000)
    printSdk.print(
      data,
      (result) => {
        window.clearTimeout(timer)
        const code = (result as { code?: number })?.code
        if (code === 0 || code === 1 || code === undefined) {
          resolve()
          return
        }
        reject(new Error(`插件打印失败: ${JSON.stringify(result)}`))
      },
      { lodopFn: opts?.preview ? 'PREVIEW' : 'PRINT' },
    )
  })

  await wait(300)
}

/** 向指定本机打印机发送一页测试内容 */
export async function testPrintLocalPrinter(opts: { printerIndex: number; printerName?: string }) {
  const LODOP = await ensureLocalPrintService()
  const name = opts.printerName || `索引 ${opts.printerIndex}`
  LODOP.PRINT_INIT('OpsMobile 打印机测试')
  applyPrinterIndex(LODOP, opts.printerIndex)
  try {
    LODOP.SET_PRINT_PAGESIZE(1, '76mm', '130mm', '')
  } catch {
    /* ignore */
  }
  try {
    LODOP.SET_PRINT_STYLE?.('FontSize', 12)
    LODOP.SET_PRINT_STYLE?.('Bold', 1)
  } catch {
    /* ignore */
  }
  const text = [
    '手机端 · 打印机测试',
    '',
    `打印机：${name}`,
    `索引：${opts.printerIndex}`,
    `时间：${new Date().toLocaleString()}`,
    '',
    '若本页从该打印机出纸，说明选择正确。',
  ].join('\n')
  if (typeof LODOP.ADD_PRINT_TEXT === 'function') {
    LODOP.ADD_PRINT_TEXT(8, 6, '68mm', '110mm', text)
  } else {
    throw new Error('本机打印组件不支持测试文本打印')
  }
  LODOP.PRINT()
  await wait(300)
}

export type BarcodeLabelItem = { code: string; name?: string }

/**
 * 用 C-Lodop 打印 SKU 条码标签（Code128）。
 * 须传入 printerIndex：条码机常与面单机不同，由调用方弹出选择。
 */
export async function printBarcodeLabelsWithLodop(
  labels: BarcodeLabelItem[],
  opts: { printerIndex: number; preview?: boolean; title?: string },
) {
  if (!labels.length) throw new Error('没有可打印的标签')
  const LODOP = await ensureLocalPrintService()
  LODOP.PRINT_INIT(opts.title || 'SKU条码标签')
  applyPrinterIndex(LODOP, opts.printerIndex)
  try {
    // 常见条码纸 50×30mm；方向 1=纵向
    LODOP.SET_PRINT_PAGESIZE(1, '50mm', '30mm', '')
  } catch {
    /* ignore */
  }

  for (let i = 0; i < labels.length; i++) {
    if (i > 0 && typeof LODOP.NewPage === 'function') {
      LODOP.NewPage()
    }
    const code = String(labels[i].code || '').trim()
    const name = String(labels[i].name || '').trim()
    if (!code) continue

    if (typeof LODOP.ADD_PRINT_BARCODE === 'function') {
      LODOP.ADD_PRINT_BARCODE(2, 2, '46mm', '14mm', '128B', code)
      try {
        LODOP.SET_PRINT_STYLEA?.(0, 'ShowBarText', 0)
      } catch {
        /* ignore */
      }
    } else if (typeof LODOP.ADD_PRINT_TEXT === 'function') {
      LODOP.SET_PRINT_STYLE?.('FontSize', 14)
      LODOP.SET_PRINT_STYLE?.('Bold', 1)
      LODOP.ADD_PRINT_TEXT(4, 2, '46mm', '10mm', code)
    } else {
      throw new Error('C-Lodop 不支持条码/文本打印')
    }

    if (typeof LODOP.ADD_PRINT_TEXT === 'function') {
      LODOP.SET_PRINT_STYLE?.('FontSize', 9)
      LODOP.SET_PRINT_STYLE?.('Bold', 1)
      LODOP.SET_PRINT_STYLE?.('Alignment', 2)
      LODOP.ADD_PRINT_TEXT(17, 2, '46mm', '5mm', code)
      if (name) {
        LODOP.SET_PRINT_STYLE?.('FontSize', 8)
        LODOP.SET_PRINT_STYLE?.('Bold', 0)
        LODOP.ADD_PRINT_TEXT(22, 2, '46mm', '6mm', name)
      }
    }
  }

  if (opts.preview) {
    LODOP.PREVIEW()
  } else {
    LODOP.PRINT()
  }
  await wait(300)
}

/** 下载插件面单 JSON，便于排查 */
export function downloadPluginDataJSON(payload: SFPluginPrintPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sf-plugin-${payload.mailNo || 'label'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
