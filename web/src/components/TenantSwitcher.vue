<template>
  <template v-if="show">
    <button type="button" class="tenant-switch" :class="variantClass" :disabled="switching" @click="open = true">
      <span class="tenant-switch__name">{{ session!.tenant.name }}</span>
      <van-icon name="arrow-down" class="tenant-switch__icon" />
    </button>

    <van-action-sheet v-model:show="open" title="切换租户" :closeable="true">
      <div class="tenant-sheet">
        <button
          v-for="t in session!.tenants"
          :key="t.id"
          type="button"
          class="tenant-sheet__item"
          :class="{ 'tenant-sheet__item--on': t.id === session!.tenant.id }"
          :disabled="switching"
          @click="pick(t.id)"
        >
          <div class="tenant-sheet__main">
            <div class="tenant-sheet__name">{{ t.name }}</div>
            <div v-if="t.code" class="tenant-sheet__code">{{ t.code }}</div>
          </div>
          <van-icon v-if="t.id === session!.tenant.id" name="success" color="#0f766e" />
        </button>
      </div>
    </van-action-sheet>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showFailToast } from 'vant'
import { useSession } from '../composables/useSession'

const props = withDefaults(
  defineProps<{
    /** header：顶栏浅色字；bar：子页浮动条 */
    variant?: 'header' | 'bar'
  }>(),
  { variant: 'header' },
)

const { session, showTenantSwitch, switchToTenant } = useSession()
const open = ref(false)
const switching = ref(false)

const show = computed(() => showTenantSwitch.value && !!session.value)
const variantClass = computed(() => `tenant-switch--${props.variant}`)

async function pick(tenantId: number) {
  if (!session.value || tenantId === session.value.tenant.id) {
    open.value = false
    return
  }
  switching.value = true
  try {
    await switchToTenant(tenantId)
  } catch (e: any) {
    switching.value = false
    showFailToast(e.message || '切换租户失败')
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
  color: inherit;
  font: inherit;
  line-height: 1.2;
}
.tenant-switch--header {
  color: rgba(255, 255, 255, 0.82);
}
.tenant-switch--bar {
  max-width: none;
  border: 1px solid rgba(15, 118, 110, 0.25);
  background: rgba(255, 255, 255, 0.96);
  color: var(--ops-primary);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 650;
  box-shadow: var(--ops-shadow-sm);
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
.tenant-sheet {
  padding: 4px 0 calc(12px + env(safe-area-inset-bottom));
  max-height: 55vh;
  overflow-y: auto;
}
.tenant-sheet__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border: none;
  border-bottom: 1px solid var(--ops-line);
  background: #fff;
  text-align: left;
}
.tenant-sheet__item--on {
  background: var(--ops-primary-soft);
}
.tenant-sheet__name {
  font-size: 15px;
  font-weight: 650;
  color: var(--ops-text);
}
.tenant-sheet__code {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ops-muted);
}
</style>
