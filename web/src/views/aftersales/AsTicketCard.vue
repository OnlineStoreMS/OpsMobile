<template>
  <div class="order-card as-card" :class="{ 'as-card--open': open }" @click="open = !open">
    <div class="prod-row">
      <img
        v-if="row.productImage"
        class="prod-pic pic-preview"
        :src="row.productImage"
        alt=""
        @click.stop="previewProductImage(row.productImage)"
      />
      <div v-else class="prod-pic prod-pic--empty">无图</div>
      <div class="prod-main">
        <div class="goods-name">{{ row.productTitle || '—' }}</div>
        <div class="muted meta">{{ row.shopName || '—' }}<template v-if="row.sku"> · {{ row.sku }}</template></div>
        <div v-if="row.productTags" class="muted meta">{{ row.productTags }}</div>
        <div class="card-foot">
          <van-tag plain :type="statusTagType">{{ row.status || row.aftersaleType || '售后' }}</van-tag>
          <span class="amt">退 ¥{{ row.refundAmount || '—' }}</span>
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div>应付 ¥{{ row.payAmount || '—' }} · 买 {{ row.buyQty || row.qty || 0 }} · 申 {{ row.qty || 0 }}</div>
      <div>订单 {{ row.orderNo || '—' }}</div>
      <div>售后 {{ row.platformAftersaleId || '—' }}</div>
      <div v-if="row.aftersaleType || row.reason">
        {{ row.aftersaleType || '' }}
        <template v-if="row.reason"> · {{ row.reason }}</template>
      </div>
      <div v-if="row.applyTime">申请 {{ formatTime(row.applyTime) }}</div>
      <div v-if="row.returnLocation">退回地 {{ row.returnLocation }}</div>
      <div v-if="row.returnTime">退回 {{ formatTime(row.returnTime) }}</div>
      <div v-if="row.tags" class="muted">{{ row.tags }}</div>
      <div v-if="row.dispute" class="tone-warning">纠纷 {{ row.dispute }}</div>
      <div v-if="timeoutLabel" :class="timeoutClass">{{ timeoutLabel }}</div>
    </div>

    <div v-if="extraTags.length" class="tag-row">
      <van-tag v-for="t in extraTags" :key="t.label" :type="t.type" plain>{{ t.label }}</van-tag>
    </div>

    <div class="logi">
      <template v-if="logi.lines.length">
        <div v-for="(line, i) in logi.lines" :key="i">
          <template v-if="line.status">
            {{ line.label }}
            <span :class="line.tone ? `tone-${line.tone}` : ''">{{ line.status }}</span>
          </template>
          <span v-else :class="line.tone ? `tone-${line.tone}` : ''">{{ line.label }}</span>
        </div>
      </template>
      <div v-else-if="row.logisticsStatus" :class="logisticsStatusClass">物流 {{ row.logisticsStatus }}</div>
      <pre v-else-if="row.logistics" class="raw">{{ row.logistics }}</pre>
      <div v-if="logi.shipNo">发货单号 {{ logi.shipNo }}</div>
      <div v-if="logi.returnNo">退货单号 {{ logi.returnNo }}</div>
      <div v-if="row.logisticsNo && !logi.shipNo && !logi.returnNo">物流单号 {{ row.logisticsNo }}</div>
      <div v-if="row.carrier" class="muted">{{ row.carrier }}</div>
    </div>

    <div class="expand-hint">
      <span class="muted">{{ tracks.length ? `${tracks.length} 条轨迹` : '明细' }}</span>
      <span class="expand-link">{{ open ? '收起' : '展开' }}</span>
    </div>

    <div v-if="open" class="expand" @click.stop>
      <div v-if="!tracks.length" class="muted">无轨迹</div>
      <div v-for="(track, i) in tracks" :key="i" class="track">
        <div class="track-title">{{ track.title || '物流记录' }}</div>
        <div v-if="track.date" class="muted">{{ track.date }}</div>
        <div v-if="trackDetail(track)" class="track-detail">{{ trackDetail(track) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AsCardRow } from '../../api/aftersales'
import { previewProductImage } from '../../utils/previewProductImage'
import {
  formatRemain,
  formatTime,
  parseTicketLogistics,
  remainSecondsOf,
  remainTone,
  trackDetail,
} from '../../utils/ticketLogistics'

const props = defineProps<{
  row: AsCardRow
  now?: number
  extraTags?: Array<{ label: string; type: 'danger' | 'warning' | 'primary' | 'success' }>
}>()

const open = ref(false)
const extraTags = computed(() => props.extraTags || [])
const tracks = computed(() => (props.row.tracks || []).slice(0, 5))
const logi = computed(() => parseTicketLogistics(props.row))

const remain = computed(() => remainSecondsOf(props.row, props.now || Date.now()))
const timeoutClass = computed(() => {
  const t = remainTone(remain.value)
  return t ? `tone-${t}` : ''
})
const timeoutLabel = computed(() => {
  const row = props.row
  if (!row.deadlineAt && !row.timeoutText && !row.remainSeconds) return ''
  if (row.deadlineAt || row.remainSeconds) {
    if (remain.value <= 0) return row.timeoutAction ? `已超时 · ${row.timeoutAction}` : '已超时'
    return `剩余 ${formatRemain(remain.value)}${row.timeoutAction ? `后${row.timeoutAction}` : ''}`
  }
  return row.timeoutText || ''
})

const statusTagType = computed(() => {
  const s = props.row.status || props.row.logisticsStatus || ''
  if (s.includes('成功') || s.includes('完成')) return 'success'
  if (s.includes('逾期') || s.includes('拦截') || s.includes('已签收')) return 'danger'
  if (s.includes('待') || s.includes('审核')) return 'warning'
  return 'primary'
})

const logisticsStatusClass = computed(() => {
  const s = props.row.logisticsStatus || ''
  if (['待取件', '已签收', '运输中'].includes(s) || props.row.needIntercept) return 'tone-danger'
  if (s === '待取件') return 'tone-warning'
  return ''
})
</script>

<style scoped>
@import './as-common.css';

.as-card--open {
  border-color: rgba(225, 29, 72, 0.28);
}
.prod-row {
  display: flex;
  gap: 10px;
}
.prod-pic {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
}
.prod-pic--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--ops-muted);
}
.prod-main {
  min-width: 0;
  flex: 1;
}
.meta {
  font-size: 12px;
  margin-top: 2px;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  gap: 8px;
}
.amt {
  font-weight: 700;
}
.meta-grid {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--ops-ink-soft);
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.logi {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.55;
}
.raw {
  margin: 0;
  font: inherit;
  white-space: pre-line;
}
.expand-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.expand-link {
  color: #be123c;
  font-weight: 600;
  font-size: 12px;
}
.expand {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ops-line);
}
.track {
  padding: 0 0 10px 12px;
  border-left: 2px solid var(--ops-line);
}
.track:last-child {
  padding-bottom: 0;
}
.track-title {
  font-weight: 650;
  font-size: 13px;
}
.track-detail {
  font-size: 12px;
  color: var(--ops-ink-soft);
  margin-top: 2px;
}
</style>
