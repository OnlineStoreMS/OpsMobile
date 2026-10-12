import { shippingApi } from '../api/shipping'

/** OpsMobile 本地保存的快递助手打印机全名（与弹窗列表文案一致） */
export const KDZS_PRINTER_NAME_KEY = 'opsmobile.kdzs.printerName'

let cloudKdzsPrinterName = ''

export function readKdzsPrinterName(): string {
  return String(localStorage.getItem(KDZS_PRINTER_NAME_KEY) || '').trim()
}

export function writeKdzsPrinterName(name: string) {
  const v = String(name || '').trim()
  if (v) localStorage.setItem(KDZS_PRINTER_NAME_KEY, v)
  else localStorage.removeItem(KDZS_PRINTER_NAME_KEY)
}

export function getCloudKdzsPrinterName(): string {
  return cloudKdzsPrinterName
}

/** 发货中心配置优先，其次本机缓存 */
export function resolveKdzsPrinterName(): string {
  return cloudKdzsPrinterName || readKdzsPrinterName() || ''
}

/** 拉取发货中心配置的手机远程打印机；有值则写入本机以便页面自动带入 */
export async function loadCloudKdzsPrinterName(): Promise<string> {
  try {
    const st = await shippingApi.getPrintSettings()
    cloudKdzsPrinterName = (st.kdzsPrinterName || '').trim()
    if (cloudKdzsPrinterName) {
      writeKdzsPrinterName(cloudKdzsPrinterName)
    }
  } catch {
    /* 云端失败时仍可用本机 */
  }
  return resolveKdzsPrinterName()
}

export async function saveKdzsPrinterName(name: string): Promise<string> {
  const v = String(name || '').trim()
  writeKdzsPrinterName(v)
  try {
    await shippingApi.updatePrintSettings({ kdzsPrinterName: v })
    cloudKdzsPrinterName = v
  } catch (e) {
    throw e
  }
  return v
}
