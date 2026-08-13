import type { Component } from 'vue'
import HomePage from './views/Home.vue'
import WarehouseHome from './views/warehouse/WarehouseHome.vue'

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
  // 例：售后 / 采购 / 报表 … 继续往后加即可
  // { path: '/aftersales', name: 'AfterSalesHome', title: '售后中心', short: '售后', component: AfterSalesHome },
]

export function hubIndexByPath(path: string): number {
  const i = hubPages.findIndex((h) => h.path === path)
  return i >= 0 ? i : 0
}

export function isHubPath(path: string): boolean {
  return hubPages.some((h) => h.path === path)
}
