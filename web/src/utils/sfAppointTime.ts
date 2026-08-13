/** 顺丰预约上门时段（对齐发货中心电脑版：今天/明天/后天 + 小时段） */

export const APPOINT_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const

export type AppointSlot = [number, string] // [dayOffset, slotKey]

export interface AppointOptionChild {
  text: string
  value: string
}

export interface AppointOption {
  text: string
  value: number
  children: AppointOptionChild[]
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatLocalDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Cascader 叶子 value：dayOffset|slotKey，避免多天同小时冲突 */
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

/** Vant Cascader 选项 */
export function buildAppointCascaderOptions(now = new Date()): AppointOption[] {
  const hourNow = now.getHours()
  const days = [
    { value: 0, text: '今天' },
    { value: 1, text: '明天' },
    { value: 2, text: '后天' },
  ]
  return days
    .map((day) => {
      const children: AppointOptionChild[] = []
      if (day.value === 0) {
        children.push({
          value: encodeAppointLeaf(day.value, 'within1h'),
          text: '1小时内',
        })
      }
      for (const h of APPOINT_HOURS) {
        if (day.value === 0 && h <= hourNow) continue
        const slotKey = `${pad2(h)}:00`
        children.push({
          value: encodeAppointLeaf(day.value, slotKey),
          text: `${pad2(h)}:00-${pad2(h + 1)}:00`,
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
  now = new Date(),
): string | undefined {
  if (pickupMode !== 'appoint') return undefined
  const [dayRaw, slot] = appointSlot
  if (dayRaw === undefined || dayRaw === null || !slot) return undefined
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
  const child = day?.children.find((c) => c.value === leaf)
  if (!day || !child) return ''
  return `${day.text} ${child.text}`
}
