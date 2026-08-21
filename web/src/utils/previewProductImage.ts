import { showImagePreview } from 'vant'

/** 预览商品/规格图片；可传入同组图片支持左右滑动 */
export function previewProductImage(
  current?: string | null,
  all?: Array<string | null | undefined>,
) {
  const url = (current || '').trim()
  if (!url) return
  const images = (all || [])
    .map((u) => (u || '').trim())
    .filter(Boolean)
  const list = images.length ? Array.from(new Set(images)) : [url]
  const start = Math.max(0, list.indexOf(url))
  showImagePreview({
    images: list,
    startPosition: start,
    closeable: true,
  })
}

export function collectPicUrls(
  items?: Array<{ picUrl?: string | null } | null | undefined>,
): string[] {
  return (items || [])
    .map((it) => (it?.picUrl || '').trim())
    .filter(Boolean)
}
