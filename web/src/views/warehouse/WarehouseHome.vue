<template>
  <div class="page home-page warehouse-home page--no-in">
    <HubHeader title="仓储中心" tone="warehouse" />

    <div class="page-body home-body">
      <div v-for="sec in sections" :key="sec.title" class="wh-section">
        <div class="section-label">{{ sec.title }}</div>
        <div class="grid-apps">
          <div
            v-for="app in sec.items"
            :key="app.path"
            class="grid-app"
            :style="{ '--tile-glow': app.glow }"
            @click="router.push(app.path)"
          >
            <div class="icon-wrap" :style="{ background: app.gradient }">
              <van-icon :name="app.icon" />
            </div>
            <div class="title">{{ app.title }}</div>
            <div class="desc">{{ app.desc }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HubHeader from '../../components/HubHeader.vue'

const router = useRouter()

const sections = [
  {
    title: '商品管理',
    items: [
      {
        path: '/warehouse/products',
        title: '商品列表',
        desc: '搜索 · 查看 · 编辑',
        icon: 'goods-collect-o',
        gradient: 'linear-gradient(145deg, #0f766e, #14b8a6)',
        glow: 'rgba(20, 184, 166, 0.28)',
      },
      {
        path: '/warehouse/products/new',
        title: '新建商品',
        desc: '录入信息 · 上传图片',
        icon: 'plus',
        gradient: 'linear-gradient(145deg, #0369a1, #0ea5e9)',
        glow: 'rgba(14, 165, 233, 0.28)',
      },
      {
        path: '/warehouse/barcode',
        title: '条码打印',
        desc: '选 SKU 打标签',
        icon: 'qr',
        gradient: 'linear-gradient(145deg, #4338ca, #6366f1)',
        glow: 'rgba(99, 102, 241, 0.28)',
      },
    ],
  },
  {
    title: '库存',
    items: [
      {
        path: '/warehouse/stock/balances',
        title: '库存查询',
        desc: '结存一览',
        icon: 'search',
        gradient: 'linear-gradient(145deg, #c2410c, #f59e0b)',
        glow: 'rgba(245, 158, 11, 0.28)',
      },
      {
        path: '/warehouse/stock/summary',
        title: '库存汇总账',
        desc: '期间进销存',
        icon: 'chart-trending-o',
        gradient: 'linear-gradient(145deg, #047857, #10b981)',
        glow: 'rgba(16, 185, 129, 0.26)',
      },
      {
        path: '/warehouse/stock/movements',
        title: '库存明细表',
        desc: '出入库流水',
        icon: 'orders-o',
        gradient: 'linear-gradient(145deg, #1d4e89, #3b82f6)',
        glow: 'rgba(59, 130, 246, 0.24)',
      },
    ],
  },
  {
    title: '仓库货位',
    items: [
      {
        path: '/warehouse/warehouses',
        title: '仓库设置',
        desc: '仓库档案',
        icon: 'shop-o',
        gradient: 'linear-gradient(145deg, #6d28d9, #8b5cf6)',
        glow: 'rgba(139, 92, 246, 0.26)',
      },
      {
        path: '/warehouse/locations',
        title: '库位管理',
        desc: '货位 · 绑 SKU',
        icon: 'location-o',
        gradient: 'linear-gradient(145deg, #be185d, #ec4899)',
        glow: 'rgba(236, 72, 153, 0.26)',
      },
    ],
  },
  {
    title: '库存盘点',
    items: [
      {
        path: '/warehouse/stocktakes',
        title: '盘点单',
        desc: '新建 · 录入 · 过账',
        icon: 'todo-list-o',
        gradient: 'linear-gradient(145deg, #b45309, #d97706)',
        glow: 'rgba(217, 119, 6, 0.26)',
      },
      {
        path: '/warehouse/stocktake-details',
        title: '盘点明细表',
        desc: '盘点结果汇总',
        icon: 'notes-o',
        gradient: 'linear-gradient(145deg, #0f766e, #2dd4bf)',
        glow: 'rgba(45, 212, 191, 0.26)',
      },
    ],
  },
  {
    title: '其它出入库',
    items: [
      {
        path: '/warehouse/other-inbounds',
        title: '其它入库单',
        desc: '手工入库过账',
        icon: 'down',
        gradient: 'linear-gradient(145deg, #047857, #34d399)',
        glow: 'rgba(52, 211, 153, 0.26)',
      },
      {
        path: '/warehouse/other-outbounds',
        title: '其它出库单',
        desc: '手工出库过账',
        icon: 'upgrade',
        gradient: 'linear-gradient(145deg, #b91c1c, #f87171)',
        glow: 'rgba(248, 113, 113, 0.26)',
      },
    ],
  },
]
</script>

<style scoped>
.wh-section {
  margin-bottom: 8px;
}
.warehouse-home {
  padding-bottom: calc(56px + var(--ops-safe-bottom));
}
</style>
