<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="title" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.docNo || detail.doc_no || `#${detail.id}` }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag">{{ DOC_STATUS_MAP[detail.status] || detail.status }}</span>
        </div>
        <div class="muted" style="margin-top: 8px; color: rgba(255,255,255,.75)">
          {{ detail.warehouseName || detail.warehouse_name }} · {{ detail.reason || '-' }}
        </div>
      </div>

      <div class="section-label">明细</div>
      <div class="card" v-for="(it, idx) in detail.items || []" :key="idx">
        <div class="order-card__no">{{ it.skuCode || it.sku_code || it.invSkuId }}</div>
        <div class="muted">数量 {{ Number(it.qty || 0) }} · 成本 {{ Number(it.cost || 0).toFixed(2) }}</div>
      </div>

      <div class="footer-safe" v-if="detail.status === 'draft'">
        <van-button type="primary" block round :loading="acting" @click="post">过账</van-button>
        <van-button block round plain type="danger" :loading="acting" @click="cancel">取消单据</van-button>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到单据" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog, showFailToast, showSuccessToast } from 'vant'
import { DOC_STATUS_MAP, whApi } from '../../api/warehouse'

const route = useRoute()
const router = useRouter()
const isOut = computed(() => route.meta.docType === 'out')
const title = computed(() => (isOut.value ? '其它出库详情' : '其它入库详情'))
const detail = ref<any>(null)
const loading = ref(true)
const acting = ref(false)

async function load() {
  const id = Number(route.params.id)
  detail.value = isOut.value ? await whApi.getOtherOut(id) : await whApi.getOtherIn(id)
}

async function post() {
  if (!detail.value?.id) return
  acting.value = true
  try {
    await showConfirmDialog({ title: '确认过账', message: '过账后将更新库存' })
    if (isOut.value) await whApi.postOtherOut(detail.value.id)
    else await whApi.postOtherIn(detail.value.id)
    showSuccessToast('已过账')
    await load()
  } catch (e: any) {
    if (e !== 'cancel') showFailToast(e.message || '过账失败')
  } finally {
    acting.value = false
  }
}

async function cancel() {
  if (!detail.value?.id) return
  acting.value = true
  try {
    await showConfirmDialog({ title: '取消单据', message: '确认取消该草稿单？' })
    if (isOut.value) await whApi.cancelOtherOut(detail.value.id)
    else await whApi.cancelOtherIn(detail.value.id)
    showSuccessToast('已取消')
    await load()
  } catch (e: any) {
    if (e !== 'cancel') showFailToast(e.message || '取消失败')
  } finally {
    acting.value = false
  }
}

onMounted(async () => {
  try {
    await load()
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.detail-hero {
  background: linear-gradient(155deg, #0b1f2a, #163447);
  color: #fff;
  border: none;
}
.detail-hero__no {
  font-family: var(--ops-display);
  font-weight: 700;
  font-size: 18px;
}
.detail-hero__tags {
  margin-top: 10px;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, #e8eef2 28%);
}
</style>
