<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="售后列表" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="订单号 / 运单号" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>

      <div class="range-block">
        <div class="range-hint">申请时间</div>
        <DateRangeBar :start="rangeStart" :end="rangeEnd" @change="onRangeChange" />
      </div>

      <div class="status-bar">
        <button
          v-for="opt in PLATFORM_OPTIONS"
          :key="opt.value"
          type="button"
          class="status-chip"
          :class="{ 'status-chip--on': platform === opt.value }"
          @click="setPlatform(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="stat-grid">
        <button
          type="button"
          class="stat-card"
          :class="{ 'stat-card--on': !scenario }"
          @click="setScenario('')"
        >
          <div class="stat-card__num">{{ stats?.total ?? '—' }}</div>
          <div class="stat-card__label">全部</div>
        </button>
        <button
          v-for="card in REFUND_STAT_CARDS"
          :key="card.scenario"
          type="button"
          class="stat-card"
          :class="{
            'stat-card--on': scenario === card.scenario,
            'stat-card--warn': card.tone === 'warn',
            'stat-card--danger': card.tone === 'danger',
            'stat-card--ok': card.tone === 'ok',
          }"
          @click="setScenario(card.scenario)"
        >
          <div class="stat-card__num">{{ countOf(card.key) }}</div>
          <div class="stat-card__label">{{ card.label }}</div>
        </button>
      </div>

      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.refundId || row.sysTid || row.tid" class="order-card">
          <div class="order-card__top">
            <div class="order-card__no">{{ orderNo(row) }}</div>
            <div class="order-card__tags">
              <van-tag plain type="primary">{{ row.afterSaleStatusText || row.afterSaleStatus || '-' }}</van-tag>
              <van-tag v-if="row.afterSaleTypeText" plain>{{ row.afterSaleTypeText }}</van-tag>
            </div>
          </div>

          <div v-if="row.goods?.length" class="goods-list">
            <div v-for="(g, gi) in row.goods" :key="gi" class="goods-row">
              <img
                v-if="g.picUrl"
                class="goods-pic pic-preview"
                :src="g.picUrl"
                alt=""
                @click="previewProductImage(g.picUrl)"
              />
              <div v-else class="goods-pic goods-pic--empty">无图</div>
              <div class="goods-main">
                <div class="goods-spec">{{ g.skuName || '默认规格' }}</div>
                <div v-if="g.num" class="muted meta-line">×{{ g.num }}</div>
              </div>
            </div>
          </div>
          <div v-else class="muted meta-line">暂无商品明细</div>

          <div class="muted meta-line">
            {{ row.shopName || '-' }}
            <template v-if="row.buyerNick"> · {{ row.buyerNick }}</template>
          </div>
          <div v-if="row.refundReason" class="muted meta-line">原因 {{ row.refundReason }}</div>
          <div class="card-foot">
            <span class="muted">{{ formatTime(row.created || row.confirmTime) }}</span>
            <div class="card-foot__right">
              <van-tag v-if="row.sla?.urgency && row.sla.urgency !== 'none'" :type="urgencyType(row.sla.urgency)" plain>
                {{ urgencyLabel(row.sla) }}
              </van-tag>
              <span class="amt">¥{{ formatAmount(row.refundAmount) }}</span>
            </div>
          </div>
          <div v-if="row.sid" class="muted meta-line">退回运单 {{ row.sid }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无售后单" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import DateRangeBar from '../../components/DateRangeBar.vue'
import {
  PLATFORM_OPTIONS,
  REFUND_STAT_CARDS,
  storesyncApi,
  type RefundItem,
  type RefundStats,
} from '../../api/storesync'
import { daysAgo, toApiDateTimeRange, todayDay } from '../../utils/dateRange'
import { previewProductImage } from '../../utils/previewProductImage'

const router = useRouter()
const keyword = ref('')
const platform = ref('FXG')
const scenario = ref('')
/** 与电脑端一致：近 30 天 */
const rangeStart = ref(daysAgo(29))
const rangeEnd = ref(todayDay())
const list = ref<RefundItem[]>([])
const stats = ref<RefundStats>()
const loading = ref(false)
const finished = ref(false)
const pageNo = ref(1)

function countOf(key: keyof RefundStats) {
  const n = stats.value?.[key]
  return n == null ? '—' : n
}

function setPlatform(v: string) {
  platform.value = v
  reload()
}

function setScenario(v: string) {
  scenario.value = v
  reload()
}

function onRangeChange(payload: { start: string; end: string }) {
  rangeStart.value = payload.start
  rangeEnd.value = payload.end
  reload()
}

/** 展示平台订单号，优先 tid */
function orderNo(row: RefundItem) {
  return row.tid || row.sysTid || row.refundId || '-'
}

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

function formatAmount(v?: number | string) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function urgencyType(u?: string): 'danger' | 'warning' | 'success' | 'primary' {
  if (u === 'expired' || u === 'imminent' || u === 'critical') return 'danger'
  if (u === 'warning') return 'warning'
  if (u === 'normal') return 'success'
  return 'primary'
}

function urgencyLabel(sla?: RefundItem['sla']) {
  if (sla?.urgencyLabel) return sla.urgencyLabel
  switch (sla?.urgency) {
    case 'expired':
      return '已超时'
    case 'imminent':
      return '极急'
    case 'critical':
      return '紧急'
    case 'warning':
      return '临近'
    case 'normal':
      return '正常'
    default:
      return '时效'
  }
}

async function loadMore() {
  loading.value = true
  try {
    const { start, end } = toApiDateTimeRange(rangeStart.value, rangeEnd.value)
    const kw = keyword.value.trim()
    const res = await storesyncApi.listRefunds({
      platform: platform.value,
      scenario: scenario.value || undefined,
      startDateTime: start,
      endDateTime: end,
      sid: kw || undefined,
      tid: kw || undefined,
      sysTid: kw || undefined,
      pageNo: pageNo.value,
      pageSize: 20,
      enrichLogistics: true,
    })
    const rows = res.items || []
    list.value = pageNo.value === 1 ? rows : list.value.concat(rows)
    if (res.stats) stats.value = res.stats
    if (rows.length < 20) finished.value = true
    else pageNo.value += 1
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  pageNo.value = 1
  finished.value = false
  list.value = []
  void loadMore()
}
</script>

<style scoped>
.range-block {
  padding-top: 4px;
}
.range-hint {
  font-size: 12px;
  color: var(--ops-muted);
  padding: 0 16px 2px;
}
.status-bar {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 4px 12px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.status-bar::-webkit-scrollbar {
  display: none;
}
.status-chip {
  flex: 0 0 auto;
  border: 1px solid rgba(15, 31, 42, 0.1);
  background: #fff;
  color: var(--ops-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.status-chip--on {
  color: #be123c;
  border-color: rgba(225, 29, 72, 0.35);
  background: rgba(225, 29, 72, 0.08);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 0 12px 10px;
}
.stat-card {
  border: 1px solid rgba(15, 31, 42, 0.08);
  background: #fff;
  border-radius: 12px;
  padding: 10px 8px;
  text-align: left;
  min-height: 58px;
}
.stat-card--on {
  border-color: rgba(225, 29, 72, 0.4);
  box-shadow: 0 0 0 1px rgba(225, 29, 72, 0.15);
  background: rgba(225, 29, 72, 0.04);
}
.stat-card--warn .stat-card__num {
  color: #c2410c;
}
.stat-card--danger .stat-card__num {
  color: #e11d48;
}
.stat-card--ok .stat-card__num {
  color: #047857;
}
.stat-card__num {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ops-ink);
}
.stat-card__label {
  margin-top: 4px;
  font-size: 11px;
  color: var(--ops-muted);
  line-height: 1.25;
}
.order-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.order-card__no {
  font-weight: 700;
  font-size: 13px;
  word-break: break-all;
}
.order-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}
.goods-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 4px 0 6px;
}
.goods-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.goods-pic {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: #f3f4f6;
}
.goods-pic--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--ops-muted);
}
.goods-main {
  min-width: 0;
  flex: 1;
}
.goods-spec {
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  word-break: break-word;
}
.meta-line {
  font-size: 12px;
  margin-top: 2px;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  gap: 8px;
}
.card-foot__right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.amt {
  font-weight: 700;
}
</style>
