<template>
  <div class="status-bar">
    <button type="button" class="status-chip" :class="{ 'status-chip--on': !modelValue }" @click="emit('update:modelValue', undefined)">
      全部店铺
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
      <span v-if="s.pendingTicketCount" class="chip-count">{{ s.pendingTicketCount }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { MarketplaceShop } from '../../api/aftersales'

defineProps<{
  shops: MarketplaceShop[]
  modelValue?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()
</script>

<style scoped>
@import './as-common.css';
</style>
