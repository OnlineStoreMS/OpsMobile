<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="待办分类" left-arrow @click-left="router.back()" />
    <div class="page-body">
      <van-loading v-if="loading" vertical>加载中…</van-loading>
      <template v-else>
        <div
          v-for="row in list"
          :key="row.id"
          class="order-card cat-row"
          @click="router.push({ path: '/todo/todos', query: { categoryId: String(row.id) } })"
        >
          <div>
            <div class="order-card__no">{{ row.name }}</div>
            <div class="muted">{{ row.code || '' }}</div>
          </div>
          <van-icon name="arrow" color="#9aabB6" />
        </div>
        <van-empty v-if="!list.length" description="暂无分类" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { todoApi } from '../../api/todo'

const router = useRouter()
const loading = ref(true)
const list = ref<any[]>([])

onMounted(async () => {
  try {
    list.value = (await todoApi.listCategories()) || []
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
</style>
