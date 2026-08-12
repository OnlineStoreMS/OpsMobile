<template>
  <div class="date-bar">
    <button
      v-for="opt in presets"
      :key="opt.key"
      type="button"
      class="date-chip"
      :class="{ 'date-chip--on': preset === opt.key }"
      @click="applyPreset(opt.key)"
    >
      {{ opt.label }}
    </button>
    <button
      type="button"
      class="date-chip date-chip--custom"
      :class="{ 'date-chip--on': preset === 'custom' }"
      @click="showCal = true"
    >
      {{ customLabel }}
    </button>

    <van-calendar
      v-model:show="showCal"
      type="range"
      :min-date="minDate"
      :max-date="maxDate"
      :default-date="calendarDefault"
      allow-same-day
      :show-confirm="true"
      confirm-text="确定"
      @confirm="onConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { daysAgo, formatDay, parseDay, todayDay } from '../utils/dateRange'

export type DatePreset = 'today' | '7d' | '30d' | 'custom'

const props = defineProps<{
  start: string
  end: string
}>()

const emit = defineEmits<{
  change: [payload: { start: string; end: string; preset: DatePreset }]
}>()

const presets: Array<{ key: Exclude<DatePreset, 'custom'>; label: string }> = [
  { key: 'today', label: '今天' },
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
]

const showCal = ref(false)
const preset = ref<DatePreset>('today')
const minDate = new Date(new Date().getFullYear() - 2, 0, 1)
const maxDate = new Date()

const calendarDefault = computed(() => [parseDay(props.start), parseDay(props.end)] as [Date, Date])

const customLabel = computed(() => {
  if (preset.value !== 'custom') return '自定义'
  if (props.start === props.end) return props.start.slice(5)
  return `${props.start.slice(5)}~${props.end.slice(5)}`
})

function detectPreset(start: string, end: string): DatePreset {
  const today = todayDay()
  if (start === today && end === today) return 'today'
  if (start === daysAgo(6) && end === today) return '7d'
  if (start === daysAgo(29) && end === today) return '30d'
  return 'custom'
}

watch(
  () => [props.start, props.end] as const,
  ([s, e]) => {
    preset.value = detectPreset(s, e)
  },
  { immediate: true },
)

function applyPreset(key: Exclude<DatePreset, 'custom'>) {
  const end = todayDay()
  let start = end
  if (key === '7d') start = daysAgo(6)
  if (key === '30d') start = daysAgo(29)
  preset.value = key
  emit('change', { start, end, preset: key })
}

function onConfirm(dates: Date | Date[]) {
  const arr = Array.isArray(dates) ? dates : [dates, dates]
  const start = formatDay(arr[0])
  const end = formatDay(arr[arr.length - 1] || arr[0])
  preset.value = 'custom'
  showCal.value = false
  emit('change', { start, end, preset: 'custom' })
}
</script>

<style scoped>
.date-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 0 12px 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.date-bar::-webkit-scrollbar {
  display: none;
}
.date-chip {
  flex: 0 0 auto;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: rgba(255, 255, 255, 0.78);
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  line-height: 1.2;
}
.date-chip--on {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, #0f766e, #14b8a6);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}
.date-chip--custom {
  letter-spacing: 0.02em;
}
</style>
