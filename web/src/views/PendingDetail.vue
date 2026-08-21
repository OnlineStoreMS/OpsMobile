<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待发货详情" left-arrow @click-left="router.back()" />
    <div class="page-body" v-if="detail">
      <div class="card detail-hero">
        <div class="detail-hero__no">{{ detail.orderNo }}</div>
        <div class="detail-hero__tags">
          <span class="ops-tag">{{ labelOmsStatus(detail.status) }}</span>
          <span class="ops-tag ops-tag--warn">{{ labelShipStatus(detail.shipStatus) }}</span>
          <span v-if="pendingPlanCount" class="ops-tag ops-tag--ok">已拆 {{ pendingPlanCount }} 段</span>
        </div>
        <div class="detail-hero__price" v-if="detail.totalAmount != null || detail.payAmount != null">
          ¥{{ Number(detail.payAmount ?? detail.totalAmount ?? 0).toFixed(2) }}
        </div>
      </div>

      <div class="section-label">收件人信息</div>
      <div class="card">
        <div class="detail-row">
          <span class="label">姓名</span>
          <span class="value">{{ detail.buyerName || detail.address?.name || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">电话</span>
          <span class="value">{{ detail.buyerPhone || detail.address?.phone || '-' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">省市区</span>
          <span class="value">{{ regionText }}</span>
        </div>
        <div class="detail-row">
          <span class="label">详细地址</span>
          <span class="value">{{ detail.address?.address || detail.address?.fullText || '-' }}</span>
        </div>
      </div>

      <div class="section-label">订单信息</div>
      <div class="card">
        <div class="detail-row"><span class="label">来源</span><span class="value">{{ formatOrderSource(detail) }}</span></div>
        <div class="detail-row"><span class="label">店铺</span><span class="value">{{ detail.shopName || '-' }}</span></div>
        <div class="detail-row"><span class="label">自营单</span><span class="value">{{ detail.selfOrderNo || '-' }}</span></div>
        <div class="detail-row"><span class="label">下单</span><span class="value">{{ formatTime(detail.orderedAt || detail.payTime) }}</span></div>
        <div class="detail-row"><span class="label">备注</span><span class="value">{{ detail.remark || detail.sellerRemark || '-' }}</span></div>
        <div class="detail-row" v-if="detail.shipContent">
          <span class="label">发货内容</span>
          <span class="value">{{ detail.shipContent }}</span>
        </div>
      </div>

      <div class="section-label">商品明细</div>
      <div class="card">
        <div v-for="row in goodsRows" :key="row.key" class="goods-row">
          <img
            v-if="row.picUrl"
            class="pic-preview"
            :src="row.picUrl"
            alt=""
            @click.stop="previewProductImage(row.picUrl, goodsRows.map((r) => r.picUrl))"
          />
          <div class="goods-info">
            <div class="goods-name">
              {{ row.title }}
              <span v-if="row.isSplit" class="tag-split">拆分</span>
            </div>
            <div class="muted" v-if="row.shipped > 0">
              已发 {{ row.shipped }}/{{ row.total }}
              <template v-if="row.fullyShipped"> · 已发完</template>
            </div>
          </div>
        </div>
        <div v-if="!goodsRows.length" class="muted">无商品行</div>
      </div>

      <div class="footer-safe" v-if="canShip">
        <div class="footer-safe__row">
          <van-button plain round hairline type="primary" @click="goShip(true)">
            {{ pendingPlanCount ? '编辑拆分' : '拆分' }}
          </van-button>
          <van-button type="primary" round style="flex: 1" @click="goShip()">打单发货</van-button>
        </div>
      </div>
    </div>
    <van-empty v-else-if="!loading" description="未找到订单" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, closeToast } from 'vant'
import { getOmsOrder, listPendingOmsOrders, shippingApi, type OMSOrder } from '../api/shipping'
import { formatOrderSource, formatTime, labelOmsStatus, labelShipStatus } from '../utils/labels'
import { healShipPlanLines, orderGoodsDisplayRows } from '../utils/sfOrderHandoff'
import { previewProductImage } from '../utils/previewProductImage'

const route = useRoute()
const router = useRouter()
const detail = ref<OMSOrder | null>(null)
const loading = ref(true)

const regionText = computed(() => {
  const a = detail.value?.address
  if (!a) return '-'
  const t = [a.province, a.city, a.district].filter(Boolean).join(' ')
  return t || '-'
})

const canShip = computed(() => {
  const s = (detail.value?.shipStatus || '').toLowerCase()
  return !s || s === 'wait_ship' || s === 'partial_shipped' || s.includes('wait')
})

const goodsRows = computed(() => (detail.value ? orderGoodsDisplayRows(detail.value) : []))
const pendingPlanCount = computed(() => detail.value?.pendingPlanCount || 0)

function goShip(split?: boolean) {
  if (!detail.value) return
  router.push({
    path: `/ship/${detail.value.id}`,
    query: {
      ...(detail.value.orderNo ? { no: detail.value.orderNo } : {}),
      ...(split ? { split: '1' } : {}),
    },
  })
}

async function loadDetail() {
  const id = Number(route.params.id)
  if (!id) return null
  try {
    return await getOmsOrder(id)
  } catch {
    const no = typeof route.query.no === 'string' ? route.query.no : ''
    const keyword = no || String(id)
    const res = await listPendingOmsOrders({ keyword, shipStatus: 'need_ship', page: 1, pageSize: 50 })
    return (res.list || []).find((o) => o.id === id) || (res.list || []).find((o) => o.orderNo === no) || null
  }
}

async function attachShipPlan(order: OMSOrder) {
  try {
    const { list } = await shippingApi.getShipPlan(order.id)
    order.shipPlanLines = healShipPlanLines(order, list || [])
    order.pendingPlanCount = (order.shipPlanLines || []).filter((l) => l.status === 'pending').length
  } catch {
    order.shipPlanLines = []
    order.pendingPlanCount = 0
  }
}

onMounted(async () => {
  showLoadingToast({ message: '加载中…', forbidClick: true, duration: 0 })
  try {
    const o = await loadDetail()
    if (o) await attachShipPlan(o)
    detail.value = o
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
    closeToast()
  }
})
</script>

<style scoped>
.detail-hero {
  background: linear-gradient(155deg, #0b1f2a, #163447 55%, #c2410c);
  color: #fff;
  border: none;
}
.detail-hero__no {
  font-family: var(--ops-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  word-break: break-all;
}
.detail-hero__tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.detail-hero__tags .ops-tag,
.detail-hero__tags .ops-tag--warn,
.detail-hero__tags .ops-tag--ok {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.detail-hero__price {
  margin-top: 14px;
  font-family: var(--ops-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.tag-split {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #047857;
  background: #d1fae5;
  padding: 1px 6px;
  border-radius: 999px;
  vertical-align: middle;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, var(--ops-bg) 30%);
}
.footer-safe__row {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>
