import { nextTick } from 'vue'

function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'))
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          setTimeout(done, 2500)
        }),
    ),
  )
}

/** 将 DOM 渲染为 PNG canvas（离屏克隆，避免预览缩放影响清晰度） */
export async function renderElementToCanvas(
  target: HTMLElement,
  opts?: { widthPx?: number; scale?: number },
): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default
  await nextTick()
  const widthPx = opts?.widthPx || target.offsetWidth || 360
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;pointer-events:none;'
  const clone = target.cloneNode(true) as HTMLElement
  clone.style.cssText = `width:${widthPx}px;max-width:${widthPx}px;max-height:none;overflow:visible;box-sizing:border-box;`
  host.appendChild(clone)
  document.body.appendChild(host)
  try {
    await waitForImages(clone)
    await nextTick()
    const h = Math.max(clone.scrollHeight, clone.offsetHeight, 1)
    return await html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: opts?.scale ?? 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: widthPx,
      height: h,
      windowWidth: widthPx,
      windowHeight: h,
    })
  } finally {
    host.remove()
  }
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export async function copyCanvasPng(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('生成图片失败')
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('当前环境不支持复制图片，请改用下载')
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(blob) })])
  }
}
