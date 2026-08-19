import { createApp, h, ref } from 'vue'
import { Button, Popup } from 'vant'
import { copyToClipboard } from './clipboard'
import { showFailToast, showSuccessToast } from 'vant'

/** 异步拉数后移动端常无法直接写剪贴板，弹出面板让用户再点一次复制 */
export function showCopySheet(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const mountEl = document.createElement('div')
    document.body.appendChild(mountEl)

    const app = createApp({
      setup() {
        const visible = ref(true)
        const copying = ref(false)
        let textareaEl: HTMLTextAreaElement | null = null

        function teardown(result: boolean) {
          visible.value = false
          window.setTimeout(() => {
            app.unmount()
            mountEl.remove()
            resolve(result)
          }, 280)
        }

        async function onCopyClick() {
          copying.value = true
          const ok = await copyToClipboard(text)
          copying.value = false
          if (ok) {
            showSuccessToast('已复制')
            teardown(true)
            return
          }
          if (textareaEl) {
            textareaEl.focus()
            textareaEl.select()
            textareaEl.setSelectionRange(0, text.length)
          }
          showFailToast('请长按下方文本手动复制')
        }

        return () =>
          h(
            Popup,
            {
              show: visible.value,
              position: 'bottom',
              round: true,
              closeable: true,
              safeAreaInsetBottom: true,
              style: { maxHeight: '75vh' },
              onClose: () => teardown(false),
            },
            {
              default: () =>
                h('div', { class: 'copy-sheet' }, [
                  h('div', { class: 'copy-sheet__title' }, '复制内容'),
                  h('div', { class: 'copy-sheet__hint' }, '若自动复制失败，请点下方按钮或长按文本复制'),
                  h('textarea', {
                    class: 'copy-sheet__text',
                    readonly: true,
                    value: text,
                    ref: (el: unknown) => {
                      textareaEl = el as HTMLTextAreaElement | null
                      if (textareaEl) {
                        window.setTimeout(() => {
                          textareaEl?.focus()
                          textareaEl?.select()
                        }, 120)
                      }
                    },
                  }),
                  h(
                    Button,
                    {
                      type: 'primary',
                      block: true,
                      loading: copying.value,
                      class: 'copy-sheet__btn',
                      onClick: onCopyClick,
                    },
                    { default: () => '复制到剪贴板' },
                  ),
                  h(
                    Button,
                    {
                      block: true,
                      plain: true,
                      hairline: true,
                      class: 'copy-sheet__btn',
                      onClick: () => teardown(false),
                    },
                    { default: () => '关闭' },
                  ),
                ]),
            },
          )
      },
    })

    app.use(Popup).use(Button)
    app.mount(mountEl)
  })
}

/** 先尝试直接复制；移动端异步场景失败则弹出复制面板 */
export async function copyTextForUser(text: string): Promise<boolean> {
  const value = (text || '').trim()
  if (!value) return false
  if (await copyToClipboard(value)) return true
  return showCopySheet(value)
}
