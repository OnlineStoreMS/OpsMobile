<template>
  <van-action-sheet
    v-model:show="visible"
    title="切换租户"
    :closeable="true"
    teleport="body"
    @closed="closeTenantSheet"
  >
    <div class="tenant-sheet">
      <button
        v-for="t in tenants"
        :key="t.id"
        type="button"
        class="tenant-sheet__item"
        :class="{ 'tenant-sheet__item--on': t.id === currentTenantId }"
        :disabled="switching"
        @click="pick(t.id)"
      >
        <div class="tenant-sheet__main">
          <div class="tenant-sheet__name">{{ t.name }}</div>
          <div v-if="t.code" class="tenant-sheet__code">{{ t.code }}</div>
        </div>
        <van-icon v-if="t.id === currentTenantId" name="success" color="#0f766e" />
      </button>
      <van-empty v-if="!tenants.length && !switching" description="暂无租户" image-size="48" />
    </div>
  </van-action-sheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showFailToast } from 'vant'
import { useSession } from '../composables/useSession'

const { session, tenantSheetOpen, closeTenantSheet, switchToTenant } = useSession()
const switching = ref(false)

const visible = computed({
  get: () => tenantSheetOpen.value,
  set: (v: boolean) => {
    tenantSheetOpen.value = v
    if (!v) closeTenantSheet()
  },
})

const tenants = computed(() => session.value?.tenants || [])
const currentTenantId = computed(() => session.value?.tenant.id ?? 0)

async function pick(tenantId: number) {
  if (!session.value || tenantId === session.value.tenant.id) {
    closeTenantSheet()
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
