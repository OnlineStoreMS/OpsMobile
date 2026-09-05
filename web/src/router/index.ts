import { createRouter, createWebHistory } from 'vue-router'
import { hubPages } from '../hubPages'

const hubRoutes = hubPages.map((h) => ({
  path: h.path,
  name: h.name,
  component: () => import('../views/HubPlaceholder.vue'),
  meta: { title: h.title, hub: true },
}))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...hubRoutes,
    {
      path: '/manual-create',
      name: 'ManualCreate',
      component: () => import('../views/ManualCreate.vue'),
      meta: { title: '新建手工单', hideTabbar: true },
    },
    {
      path: '/self-orders',
      name: 'SelfOrders',
      component: () => import('../views/SelfOrders.vue'),
      meta: { title: '自营订单', hideTabbar: true },
    },
    {
      path: '/self-orders/:id',
      name: 'SelfOrderDetail',
      component: () => import('../views/SelfOrderDetail.vue'),
      meta: { title: '自营订单详情', hideTabbar: true },
    },
    {
      path: '/pending',
      name: 'PendingOrders',
      component: () => import('../views/PendingOrders.vue'),
      meta: { title: '待发货', hideTabbar: true },
    },
    {
      path: '/pending/:id',
      name: 'PendingDetail',
      component: () => import('../views/PendingDetail.vue'),
      meta: { title: '待发货详情', hideTabbar: true },
    },
    {
      path: '/shipped',
      name: 'ShippedOrders',
      component: () => import('../views/ShippedOrders.vue'),
      meta: { title: '已发货', hideTabbar: true },
    },
    {
      path: '/shipped/:id',
      name: 'ShippedDetail',
      component: () => import('../views/ShippedDetail.vue'),
      meta: { title: '已发货详情', hideTabbar: true },
    },
    {
      path: '/shipped/:id/reship',
      name: 'Reship',
      component: () => import('../views/Reship.vue'),
      meta: { title: '重新发货', hideTabbar: true },
    },
    {
      path: '/ship/:orderId',
      name: 'ShipOrder',
      component: () => import('../views/ShipOrder.vue'),
      meta: { title: '打单发货', hideTabbar: true },
    },
    {
      path: '/sf-order',
      name: 'SFOrderPrint',
      component: () => import('../views/SFOrderPrint.vue'),
      meta: { title: '顺丰标准寄件', hideTabbar: true },
    },
    {
      path: '/printers',
      name: 'PrinterSettings',
      component: () => import('../views/PrinterSettings.vue'),
      meta: { title: '打印机管理', hideTabbar: true },
    },
    {
      path: '/kdzs-print',
      name: 'KdzsPrintSettings',
      component: () => import('../views/KdzsPrintSettings.vue'),
      meta: { title: '快递助手远程打单', hideTabbar: true },
    },

    // —— 仓储子页 ——
    {
      path: '/warehouse/products',
      name: 'WhProducts',
      component: () => import('../views/warehouse/ProductList.vue'),
      meta: { title: '商品列表', hideTabbar: true },
    },
    {
      path: '/warehouse/products/new',
      name: 'WhProductNew',
      component: () => import('../views/warehouse/ProductForm.vue'),
      meta: { title: '新建商品', hideTabbar: true },
    },
    {
      path: '/warehouse/products/:id',
      name: 'WhProductEdit',
      component: () => import('../views/warehouse/ProductForm.vue'),
      meta: { title: '编辑商品', hideTabbar: true },
    },
    {
      path: '/warehouse/barcode',
      name: 'WhBarcode',
      component: () => import('../views/warehouse/BarcodePrint.vue'),
      meta: { title: '条码打印', hideTabbar: true },
    },
    {
      path: '/warehouse/stock/balances',
      name: 'WhStockBalances',
      component: () => import('../views/warehouse/StockBalances.vue'),
      meta: { title: '库存查询', hideTabbar: true },
    },
    {
      path: '/warehouse/stock/summary',
      name: 'WhStockSummary',
      component: () => import('../views/warehouse/StockSummary.vue'),
      meta: { title: '库存汇总账', hideTabbar: true },
    },
    {
      path: '/warehouse/stock/movements',
      name: 'WhStockMovements',
      component: () => import('../views/warehouse/StockMovements.vue'),
      meta: { title: '库存明细表', hideTabbar: true },
    },
    {
      path: '/warehouse/warehouses',
      name: 'WhWarehouses',
      component: () => import('../views/warehouse/WarehouseList.vue'),
      meta: { title: '仓库设置', hideTabbar: true },
    },
    {
      path: '/warehouse/locations',
      name: 'WhLocations',
      component: () => import('../views/warehouse/LocationList.vue'),
      meta: { title: '库位管理', hideTabbar: true },
    },
    {
      path: '/warehouse/stocktakes',
      name: 'WhStocktakes',
      component: () => import('../views/warehouse/StocktakeList.vue'),
      meta: { title: '盘点单', hideTabbar: true },
    },
    {
      path: '/warehouse/stocktakes/:id',
      name: 'WhStocktakeDetail',
      component: () => import('../views/warehouse/StocktakeDetail.vue'),
      meta: { title: '盘点单详情', hideTabbar: true },
    },
    {
      path: '/warehouse/stocktake-details',
      name: 'WhStocktakeDetails',
      component: () => import('../views/warehouse/StocktakeDetailList.vue'),
      meta: { title: '盘点明细表', hideTabbar: true },
    },
    {
      path: '/warehouse/other-inbounds',
      name: 'WhOtherInbounds',
      component: () => import('../views/warehouse/OtherInboundList.vue'),
      meta: { title: '其它入库单', hideTabbar: true },
    },
    {
      path: '/warehouse/other-inbounds/:id',
      name: 'WhOtherInDetail',
      component: () => import('../views/warehouse/OtherDocDetail.vue'),
      meta: { title: '其它入库详情', hideTabbar: true, docType: 'in' },
    },
    {
      path: '/warehouse/other-outbounds',
      name: 'WhOtherOutbounds',
      component: () => import('../views/warehouse/OtherOutboundList.vue'),
      meta: { title: '其它出库单', hideTabbar: true },
    },
    {
      path: '/warehouse/other-outbounds/:id',
      name: 'WhOtherOutDetail',
      component: () => import('../views/warehouse/OtherDocDetail.vue'),
      meta: { title: '其它出库详情', hideTabbar: true, docType: 'out' },
    },

    // —— 订单中心子页 ——
    {
      path: '/order/orders',
      name: 'OmsOrders',
      component: () => import('../views/order/OrderList.vue'),
      meta: { title: '全部订单', hideTabbar: true },
    },
    {
      path: '/order/orders/:id',
      name: 'OmsOrderDetail',
      component: () => import('../views/order/OrderDetail.vue'),
      meta: { title: '订单详情', hideTabbar: true },
    },

    // —— 供应链子页 ——
    {
      path: '/supply/purchase-orders',
      name: 'SupplyPOs',
      component: () => import('../views/supply/PurchaseOrderList.vue'),
      meta: { title: '采购订单', hideTabbar: true },
    },
    {
      path: '/supply/purchase-orders/:id',
      name: 'SupplyPODetail',
      component: () => import('../views/supply/PurchaseOrderDetail.vue'),
      meta: { title: '采购单详情', hideTabbar: true },
    },
    {
      path: '/supply/suppliers',
      name: 'SupplySuppliers',
      component: () => import('../views/supply/SupplierList.vue'),
      meta: { title: '供应商', hideTabbar: true },
    },
    {
      path: '/supply/scan-inbound',
      name: 'SupplyScanInbound',
      component: () => import('../views/supply/ScanInbound.vue'),
      meta: { title: '包裹扫描', hideTabbar: true },
    },
    {
      path: '/supply/package-receives',
      name: 'SupplyPackageReceives',
      component: () => import('../views/supply/PackageReceiveList.vue'),
      meta: { title: '收货记录', hideTabbar: true },
    },
    {
      path: '/supply/inbounds',
      name: 'SupplyInbounds',
      component: () => import('../views/supply/InboundList.vue'),
      meta: { title: '采购入库单', hideTabbar: true },
    },

    // —— 素材中心子页 ——
    {
      path: '/material/materials',
      name: 'MaterialList',
      component: () => import('../views/material/MaterialList.vue'),
      meta: { title: '全部素材', hideTabbar: true },
    },
    {
      path: '/material/materials/:id',
      name: 'MaterialDetail',
      component: () => import('../views/material/MaterialDetail.vue'),
      meta: { title: '素材详情', hideTabbar: true },
    },
    {
      path: '/material/categories',
      name: 'MaterialCategories',
      component: () => import('../views/material/CategoryList.vue'),
      meta: { title: '素材分类', hideTabbar: true },
    },

    // —— 待办中心子页 ——
    {
      path: '/todo/todos',
      name: 'TodoList',
      component: () => import('../views/todo/TodoList.vue'),
      meta: { title: '全部待办', hideTabbar: true },
    },
    {
      path: '/todo/todos/:id',
      name: 'TodoDetail',
      component: () => import('../views/todo/TodoDetail.vue'),
      meta: { title: '待办详情', hideTabbar: true },
    },
    {
      path: '/todo/categories',
      name: 'TodoCategories',
      component: () => import('../views/todo/CategoryList.vue'),
      meta: { title: '待办分类', hideTabbar: true },
    },

    // —— 售后中心子页 ——
    {
      path: '/aftersales/shops',
      name: 'AsShops',
      component: () => import('../views/aftersales/ShopList.vue'),
      meta: { title: '店铺列表', hideTabbar: true },
    },
    {
      path: '/aftersales/shops/:id',
      name: 'AsShopWorkbench',
      component: () => import('../views/aftersales/ShopWorkbench.vue'),
      meta: { title: '店铺工作台', hideTabbar: true },
    },
    {
      path: '/aftersales/tickets',
      name: 'AsTickets',
      component: () => import('../views/aftersales/TicketList.vue'),
      meta: { title: '售后单', hideTabbar: true },
    },
    {
      path: '/aftersales/intercept',
      name: 'AsIntercept',
      component: () => import('../views/aftersales/RefundList.vue'),
      meta: { title: '需商家拦截快递', hideTabbar: true, mode: 'intercept' },
    },
    {
      path: '/aftersales/shipped-success',
      name: 'AsShippedSuccess',
      component: () => import('../views/aftersales/RefundList.vue'),
      meta: { title: '已发货退款成功', hideTabbar: true, mode: 'shipped' },
    },
    {
      path: '/aftersales/return-refunds',
      name: 'AsReturnRefunds',
      component: () => import('../views/aftersales/RefundList.vue'),
      meta: { title: '退货退款成功', hideTabbar: true, mode: 'return-refund' },
    },
    {
      path: '/aftersales/returns',
      name: 'AsReturns',
      component: () => import('../views/aftersales/RefundList.vue'),
      meta: { title: '退回件', hideTabbar: true, mode: 'returns' },
    },
    {
      path: '/aftersales/service-orders',
      name: 'AsServiceOrders',
      component: () => import('../views/aftersales/ServiceOrderList.vue'),
      meta: { title: '服务工单', hideTabbar: true },
    },

    // —— 电商店铺同步子页 ——
    {
      path: '/storesync/products',
      name: 'StoreSyncProducts',
      component: () => import('../views/storesync/ProductList.vue'),
      meta: { title: '电商商品', hideTabbar: true },
    },
    {
      path: '/storesync/refunds',
      name: 'StoreSyncRefunds',
      component: () => import('../views/storesync/RefundList.vue'),
      meta: { title: '售后列表', hideTabbar: true },
    },

    // —— 门店管理子页 ——
    {
      path: '/store/cashier',
      name: 'StoreCashier',
      component: () => import('../views/store/Cashier.vue'),
      meta: { title: '收银台', hideTabbar: true },
    },
    {
      path: '/store/services',
      name: 'StoreServices',
      component: () => import('../views/store/ServiceCatalog.vue'),
      meta: { title: '服务目录', hideTabbar: true },
    },
  ],
})

router.beforeEach((to) => {
  document.title = String(to.meta.title || 'OpsMobile')
  return true
})

export default router
