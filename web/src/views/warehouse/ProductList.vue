<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="商品列表" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="router.push('/warehouse/products/new')">新建</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="父SKU / 名称 / 库存SKU" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.id" class="order-card" @click="router.push(`/warehouse/products/${row.id}`)">
          <div class="prod-row">
            <img
              v-if="row.pic"
              :src="row.pic"
              class="prod-pic pic-preview"
              alt=""
              @click.stop="previewProductImage(row.pic)"
            />
            <div class="prod-pic prod-pic--empty" v-else>无图</div>
            <div class="prod-body">
              <div class="order-card__no">{{ row.parentSku || row.parent_sku }}</div>
              <div class="goods-name">{{ row.name }}</div>
              <div class="muted">{{ row.categoryName || row.category_name || '未分类' }}</div>
            </div>
            <van-icon name="arrow" color="#9aabB6" />
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无商品" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { whApi } from '../../api/warehouse'
import { previewProductImage } from '../../utils/previewProductImage'

const router = useRouter()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadMore() {
  loading.value = true
  try {
    const res = await whApi.listProducts({
      keyword: keyword.value.trim() || undefined,
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    list.value = page.value === 1 ? rows : list.value.concat(rows)
    if (rows.length < 20) finished.value = true
    else page.value += 1
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  void loadMore()
}
</script>

<style scoped>
.prod-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.prod-pic {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  object-fit: cover;
  background: #eef2f5;
  flex-shrink: 0;
}
.prod-pic--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--ops-muted);
}
.prod-body {
  flex: 1;
  min-width: 0;
}
.goods-name {
  font-weight: 600;
  font-size: 14px;
  margin: 4px 0;
}
.nav-link {
  color: var(--ops-primary);
  font-weight: 600;
  font-size: 14px;
}
</style>
