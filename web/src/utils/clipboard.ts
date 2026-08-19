/** 复制文本到剪贴板（兼容移动端 Safari 与 HTTP 非安全上下文） */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fallback below
    }
  }

  return execCopyFallback(text)
}

function execCopyFallback(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '2em'
  textarea.style.height = '2em'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.fontSize = '16px'
  textarea.style.opacity = '0'
  textarea.setAttribute('aria-hidden', 'true')

  document.body.appendChild(textarea)
  textarea.focus({ preventScroll: true })

  let ok = false
  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }

  document.body.removeChild(textarea)
  return ok
}
