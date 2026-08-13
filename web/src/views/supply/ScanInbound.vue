<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="包裹扫描" left-arrow @click-left="router.back()" />
    <div class="page-body">
      <div class="card">
        <van-field v-model="trackingNo" label="运单号" placeholder="扫描或输入运单号" clearable autofocus />
        <van-field v-model="remark" label="备注" placeholder="可选" clearable />
        <van-button type="primary" block round :loading="submitting" :disabled="!trackingNo.trim()" @click="onScan">
          确认收包
        </van-button>
      </div>

      <div class="section-label" v-if="last">最近一次</div>
      <div class="card" v-if="last">
        <div class="order-card__no">{{ last.trackingNo }}</div>
        <div class="muted">{{ last.carrier || '-' }} · {{ last.warehouseName || '-' }}</div>
        <div class="muted">{{ last.poNo || '未关联采购单' }} · {{ formatTime(last.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { supplyApi } from '../../api/supply'

const router = useRouter()
const trackingNo = ref('')
const remark = ref('')
const submitting = ref(false)
const last = ref<any>(null)

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function onScan() {
  const no = trackingNo.value.trim()
  if (!no) return
  submitting.value = true
  try {
    last.value = await supplyApi.scanPackage({
      trackingNo: no,
      remark: remark.value.trim() || undefined,
    })
    showSuccessToast('收包成功')
    trackingNo.value = ''
    remark.value = ''
  } catch (e: any) {
    showFailToast(e.message || '收包失败')
  } finally {
    submitting.value = false
  }
}
</script>
