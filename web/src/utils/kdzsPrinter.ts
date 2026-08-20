/** OpsMobile 本地保存的快递助手打印机全名（与弹窗列表文案一致） */
export const KDZS_PRINTER_NAME_KEY = 'opsmobile.kdzs.printerName'

export function readKdzsPrinterName(): string {
  return String(localStorage.getItem(KDZS_PRINTER_NAME_KEY) || '').trim()
}

export function writeKdzsPrinterName(name: string) {
  const v = String(name || '').trim()
  if (v) localStorage.setItem(KDZS_PRINTER_NAME_KEY, v)
  else localStorage.removeItem(KDZS_PRINTER_NAME_KEY)
}
