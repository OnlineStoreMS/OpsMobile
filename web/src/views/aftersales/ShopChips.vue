<template>
  <div class="status-bar">
    <button type="button" class="status-chip" :class="{ 'status-chip--on': !modelValue }" @click="emit('update:modelValue', undefined)">
      全部店铺
      <span v-if="allCount" class="chip-count">{{ allCount }}</span>
    </button>
    <button
      v-for="s in shops"
      :key="s.id"
      type="button"
      class="status-chip"
      :class="{ 'status-chip--on': modelValue === s.id }"
      @click="emit('update:modelValue', s.id)"
    >
      {{ s.name }}
      <span v-if="countOf(s.id)" class="chip-count">{{ countOf(s.id) }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MarketplaceShop } from '../../api/aftersales'

const props = defineProps<{
  shops: MarketplaceShop[]
  modelValue?: number
  counts?: Record<number, number>
  allCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

function countOf(id: number) {
  return props.counts?.[id] || 0
}
</script>

<style scoped>
@import './as-common.css';
</style>
