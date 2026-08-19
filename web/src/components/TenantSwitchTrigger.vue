<template>
  <button
    v-if="show"
    type="button"
    class="tenant-switch tenant-switch--header"
    :disabled="switching"
    @click="onOpen"
  >
    <span class="tenant-switch__name">{{ session!.tenant.name }}</span>
    <van-icon name="arrow-down" class="tenant-switch__icon" />
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showFailToast } from 'vant'
import { useSession } from '../composables/useSession'

const { session, showTenantSwitch, openTenantSheet } = useSession()
const switching = ref(false)

const show = computed(() => showTenantSwitch.value && !!session.value)

async function onOpen() {
  switching.value = true
  try {
    await openTenantSheet()
  } catch (e: any) {
    showFailToast(e.message || '加载租户失败')
  } finally {
    switching.value = false
  }
}
</script>

<style scoped>
.tenant-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 9em;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  font: inherit;
  line-height: 1.2;
}
.tenant-switch__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tenant-switch__icon {
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.75;
}
</style>
