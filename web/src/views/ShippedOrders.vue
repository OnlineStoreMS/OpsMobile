<template>
  <div class="page">
    <van-nav-bar title="已发货" left-arrow @click-left="router.back()" />
    <van-search v-model="keyword" placeholder="运单号/收件人/单号" show-action @search="reload">
      <template #action>
        <div @click="reload">搜索</div>
      </template>
    </van-search>
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
      <div
        v-for="row in list"
        :key="row.id"
        class="card"
        style="cursor: pointer"
        @click="router.push(`/shipped/${row.id}`)"
      >
        <div class="list-item-title">
          {{ row.mailNo || row.sourceRef || `#${row.id}` }}
          <van-tag plain type="success" style="margin-left: 6px">{{ row.status }}</van-tag>
        </div>
        <div class="list-item-meta">
          <div>{{ row.receiverName }} {{ row.receiverMobile }}</div>
          <div>{{ row.cargoName || row.items?.[0]?.goodsName || '-' }}</div>
          <div>{{ formatTime(row.printedAt || row.createdAt) }}</div>
        </div>
      </div>
      <van-empty v-if="!loading && !list.length" description="暂无已发货单" />
    </van-list>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { listShipments, type Shipment } from '../api/shipping'

const router = useRouter()
const keyword = ref('')
const list = ref<Shipment[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

function formatTime(v?: string) {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

async function reload() {
  page.value = 1
  finished.value = false
  list.value = []
  await loadMore()
}

async function loadMore() {
  loading.value = true
  try {
    const res = await listShipments({
      keyword: keyword.value.trim() || undefined,
      status: 'printed',
      page: page.value,
      pageSize: 20,
    })
    const rows = res.list || []
    list.value.push(...rows)
    if (list.value.length >= (res.total || 0) || rows.length < 20) {
      finished.value = true
    } else {
      page.value += 1
    }
  } catch (e: any) {
    finished.value = true
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}
</script>
