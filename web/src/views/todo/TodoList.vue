<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="navTitle" left-arrow @click-left="router.back()" />
    <div class="list-shell">
      <van-search v-model="keyword" shape="round" placeholder="标题 / 描述" show-action @search="reload">
        <template #action>
          <div class="search-action" @click="reload">搜索</div>
        </template>
      </van-search>
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadMore">
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card"
          @click="router.push(`/todo/todos/${row.id}`)"
        >
          <div class="order-card__top">
            <div class="order-card__no">{{ row.title }}</div>
            <van-tag plain :type="statusType(row.status)">{{ labelTodoStatus(row.status) }}</van-tag>
          </div>
          <div class="muted">
            {{ row.categoryName || '未分类' }}
            · 优先级 {{ labelTodoPriority(row.priority) }}
            <template v-if="row.isMonthlyInstance || row.recurrence === 'monthly'"> · 月待办</template>
          </div>
          <div class="muted" v-if="row.dueAt">截止 {{ formatTime(row.dueAt) }}</div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无待办" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { labelTodoPriority, labelTodoStatus, todoApi } from '../../api/todo'

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const list = ref<any[]>([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const statusFilter = computed(() => (typeof route.query.status === 'string' ? route.query.status : ''))
const recurrenceFilter = computed(() =>
  typeof route.query.recurrence === 'string' ? route.query.recurrence : '',
)
const categoryId = computed(() => {
  const v = route.query.categoryId
  return typeof v === 'string' && v ? Number(v) : undefined
})

const navTitle = computed(() => {
  if (statusFilter.value === 'pending') return '待处理'
  if (statusFilter.value === 'in_progress') return '进行中'
  if (recurrenceFilter.value === 'monthly') return '月待办'
  if (categoryId.value) return '分类待办'
  return '全部待办'
})

function statusType(s?: string): 'primary' | 'success' | 'warning' | 'danger' {
  if (s === 'done') return 'success'
  if (s === 'in_progress') return 'primary'
  if (s === 'cancelled') return 'danger'
  return 'warning'
}

function formatTime(v?: string) {
  if (!v) return ''
  return String(v).replace('T', ' ').slice(0, 16)
}

async function loadMore() {
  loading.value = true
  try {
    const res = await todoApi.listTodos({
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value || undefined,
      recurrence: recurrenceFilter.value || undefined,
      categoryId: categoryId.value || undefined,
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

watch(
  () => [route.query.status, route.query.recurrence, route.query.categoryId],
  () => reload(),
)
</script>

<style scoped>
.order-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.order-card__no {
  flex: 1;
  min-width: 0;
}
</style>
