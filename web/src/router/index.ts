import { createRouter, createWebHistory } from 'vue-router'
import { ensureSession, redirectToPortal } from '../utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
      meta: { title: '手机端应用中心' },
    },
    {
      path: '/manual-create',
      name: 'ManualCreate',
      component: () => import('../views/ManualCreate.vue'),
      meta: { title: '新建手工单' },
    },
    {
      path: '/self-orders',
      name: 'SelfOrders',
      component: () => import('../views/SelfOrders.vue'),
      meta: { title: '自营订单' },
    },
    {
      path: '/self-orders/:id',
      name: 'SelfOrderDetail',
      component: () => import('../views/SelfOrderDetail.vue'),
      meta: { title: '自营订单详情' },
    },
    {
      path: '/pending',
      name: 'PendingOrders',
      component: () => import('../views/PendingOrders.vue'),
      meta: { title: '待发货' },
    },
    {
      path: '/pending/:id',
      name: 'PendingDetail',
      component: () => import('../views/PendingDetail.vue'),
      meta: { title: '待发货详情' },
    },
    {
      path: '/shipped',
      name: 'ShippedOrders',
      component: () => import('../views/ShippedOrders.vue'),
      meta: { title: '已发货' },
    },
    {
      path: '/shipped/:id',
      name: 'ShippedDetail',
      component: () => import('../views/ShippedDetail.vue'),
      meta: { title: '已发货详情' },
    },
  ],
})

router.beforeEach(async (to) => {
  document.title = String(to.meta.title || '手机端应用中心')
  const ok = await ensureSession()
  if (!ok) {
    redirectToPortal()
    return false
  }
  return true
})

export default router
