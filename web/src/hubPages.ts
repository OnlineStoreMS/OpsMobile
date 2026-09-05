import type { Component } from 'vue'
import HomePage from './views/Home.vue'
import WarehouseHome from './views/warehouse/WarehouseHome.vue'
import OrderHome from './views/order/OrderHome.vue'
import SupplyHome from './views/supply/SupplyHome.vue'
import MaterialHome from './views/material/MaterialHome.vue'
import TodoHome from './views/todo/TodoHome.vue'
import StoreSyncHome from './views/storesync/StoreSyncHome.vue'
import StoreHome from './views/store/StoreHome.vue'
import AfterSalesHome from './views/aftersales/AfterSalesHome.vue'

/**
 * OpsMobile 顶层大页（安卓 ViewPager）。
 * 后续新增整页入口：在此追加一项，并保证 path 不与子路由冲突；
 * 路由会从本表自动注册。
 */
export type HubPageDef = {
  path: string
  name: string
  /** document.title */
  title: string
  /** 指示条短名 */
  short: string
  component: Component
}

export const hubPages: HubPageDef[] = [
  {
    path: '/',
    name: 'Home',
    title: '轻量履约',
    short: '履约',
    component: HomePage,
  },
  {
    path: '/warehouse',
    name: 'WarehouseHome',
    title: '仓储中心',
    short: '仓储',
    component: WarehouseHome,
  },
  {
    path: '/order',
    name: 'OrderHome',
    title: '订单中心',
    short: '订单',
    component: OrderHome,
  },
  {
    path: '/supply',
    name: 'SupplyHome',
    title: '供应链中心',
    short: '供应链',
    component: SupplyHome,
  },
  {
    path: '/storesync',
    name: 'StoreSyncHome',
    title: '电商店铺同步',
    short: '电商店铺',
    component: StoreSyncHome,
  },
  {
    path: '/aftersales',
    name: 'AfterSalesHome',
    title: '售后中心',
    short: '售后',
    component: AfterSalesHome,
  },
  {
    path: '/store',
    name: 'StoreHome',
    title: '门店管理',
    short: '门店',
    component: StoreHome,
  },
  {
    path: '/material',
    name: 'MaterialHome',
    title: '素材中心',
    short: '素材',
    component: MaterialHome,
  },
  {
    path: '/todo',
    name: 'TodoHome',
    title: '待办中心',
    short: '待办',
    component: TodoHome,
  },
]

export function hubIndexByPath(path: string): number {
  const i = hubPages.findIndex((h) => h.path === path)
  return i >= 0 ? i : 0
}

export function isHubPath(path: string): boolean {
  return hubPages.some((h) => h.path === path)
}
