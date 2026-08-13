<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="供应商" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="名称 / 编码" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div v-for="row in list" :key="row.id" class="order-card">
          <div class="order-card__no">{{ row.name }}</div>
          <div class="muted">{{ row.code }} · {{ row.contactName || row.buyerName || '-' }}</div>
          <div class="muted">{{ row.mobile || row.phone || row.officePhone || '' }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无供应商" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { supplyApi } from '../../api/supply'

const router = useRouter()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadMore() {
  loading.value = true
  try {
    const res = await supplyApi.listSuppliers({
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
