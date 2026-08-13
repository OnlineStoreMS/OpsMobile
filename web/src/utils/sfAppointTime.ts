/** 顺丰预约上门时段：优先用官方 startTm/endTm 生成的 options；本地兜底对齐企服。 */

export type AppointSlot = [number, string] // [dayOffset, slotKey]

export interface AppointOptionChild {
  text: string
  value: string // dayOffset|slotKey
  slotKey?: string
  sendStartTm?: string
}

export interface AppointOption {
  text: string
  value: number
  children: AppointOptionChild[]
}

export interface PickupTimeApiDay {
  value: number
  text: string
  children: Array<{
    value: string
    text: string
    slotKey: string
    sendStartTm: string
  }>
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatLocalDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function encodeAppointLeaf(dayOffset: number, slotKey: string): string {
  return `${dayOffset}|${slotKey}`
}

export function decodeAppointLeaf(leaf: string | number): AppointSlot | null {
  const raw = String(leaf || '')
  const idx = raw.indexOf('|')
  if (idx <= 0) return null
  const day = Number(raw.slice(0, idx))
  const slot = raw.slice(idx + 1)
  if (!Number.isFinite(day) || !slot) return null
  return [day, slot]
}

/** 把后端 /sf/check-pickup-time 的 options 转成 Cascader 结构 */
export function mapPickupApiOptions(apiDays: PickupTimeApiDay[]): AppointOption[] {
  return (apiDays || [])
    .map((d) => ({
      value: d.value,
      text: d.text,
      children: (d.children || []).map((c) => ({
        value: c.value || encodeAppointLeaf(d.value, c.slotKey),
        text: c.text,
        slotKey: c.slotKey,
        sendStartTm: c.sendStartTm,
      })),
    }))
    .filter((d) => d.children.length > 0)
}

/** 本地兜底：08:00–20:00 + 当前时间过滤 + 1小时内 */
export function buildAppointCascaderOptions(now = new Date()): AppointOption[] {
  const startMin = 8 * 60
  const endMin = 20 * 60
  const days = [
    { value: 0, text: '今天' },
    { value: 1, text: '明天' },
    { value: 2, text: '后天' },
  ]
  return days
    .map((day) => {
      const children: AppointOptionChild[] = []
      if (day.value === 0) {
        const within = new Date(now.getTime() + 15 * 60 * 1000)
        const wm = within.getHours() * 60 + within.getMinutes()
        if (wm >= startMin && wm < endMin) {
          children.push({
            value: encodeAppointLeaf(0, 'within1h'),
            text: '1小时内',
            slotKey: 'within1h',
            sendStartTm: formatLocalDateTime(within),
          })
        }
      }
      let first = startMin
      if (day.value === 0) {
        const next =
          now.getMinutes() > 0 || now.getSeconds() > 0
            ? (now.getHours() + 1) * 60
            : now.getHours() * 60
        if (next > first) first = next
      }
      for (let slotStart = first; slotStart < endMin; slotStart += 60) {
        const h = Math.floor(slotStart / 60)
        const slotKey = `${pad2(h)}:00`
        const sendAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day.value, h, 0, 0)
        children.push({
          value: encodeAppointLeaf(day.value, slotKey),
          text: `${pad2(h)}:00-${pad2(h + 1)}:00`,
          slotKey,
          sendStartTm: formatLocalDateTime(sendAt),
        })
      }
      return { value: day.value, text: day.text, children }
    })
    .filter((d) => d.children.length > 0)
}

export function defaultAppointSlot(options?: AppointOption[]): AppointSlot | [] {
  const opts = options || buildAppointCascaderOptions()
  const firstDay = opts[0]
  const firstSlot = firstDay?.children?.[0]
  if (!firstDay || !firstSlot) return []
  const decoded = decodeAppointLeaf(firstSlot.value)
  return decoded || []
}

export function resolveSendStartTm(
  pickupMode: 'self' | 'appoint',
  appointSlot: Array<number | string>,
  options?: AppointOption[],
  now = new Date(),
): string | undefined {
  if (pickupMode !== 'appoint') return undefined
  const [dayRaw, slot] = appointSlot
  if (dayRaw === undefined || dayRaw === null || !slot) return undefined
  const leaf = encodeAppointLeaf(Number(dayRaw), String(slot))
  const fromOpt = options
    ?.find((d) => d.value === Number(dayRaw))
    ?.children.find((c) => c.value === leaf || c.slotKey === String(slot))
  if (fromOpt?.sendStartTm) return fromOpt.sendStartTm

  const dayOffset = Number(dayRaw)
  if (slot === 'within1h') {
    return formatLocalDateTime(new Date(now.getTime() + 15 * 60 * 1000))
  }
  const m = String(slot).match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return undefined
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + dayOffset,
    Number(m[1]),
    Number(m[2]),
    0,
  )
  return formatLocalDateTime(d)
}

export function appointSlotLabel(
  options: AppointOption[],
  appointSlot: Array<number | string>,
): string {
  const [dayRaw, slot] = appointSlot
  if (dayRaw === undefined || dayRaw === null || !slot) return ''
  const leaf = encodeAppointLeaf(Number(dayRaw), String(slot))
  const day = options.find((d) => d.value === Number(dayRaw))
  const child = day?.children.find((c) => c.value === leaf || c.slotKey === String(slot))
  if (!day || !child) return ''
  return `${day.text} ${child.text}`
}
