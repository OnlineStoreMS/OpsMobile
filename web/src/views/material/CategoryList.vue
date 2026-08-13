<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="素材分类" left-arrow @click-left="router.back()" />
    <div class="page-body">
      <van-loading v-if="loading" vertical>加载中…</van-loading>
      <template v-else>
        <div v-for="node in flat" :key="node.id" class="order-card cat-row" @click="openCat(node.id)">
          <div class="cat-name" :style="{ paddingLeft: `${node.depth * 14}px` }">{{ node.name }}</div>
          <van-icon name="arrow" color="#9aabB6" />
        </div>
        <van-empty v-if="!flat.length" description="暂无分类" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast } from 'vant'
import { materialApi } from '../../api/material'

const router = useRouter()
const loading = ref(true)
const flat = ref<{ id: number; name: string; depth: number }[]>([])

function walk(nodes: any[], depth: number, out: { id: number; name: string; depth: number }[]) {
  for (const n of nodes || []) {
    out.push({ id: n.id, name: n.name, depth })
    if (n.children?.length) walk(n.children, depth + 1, out)
  }
}

function openCat(id: number) {
  router.push({ path: '/material/materials', query: { categoryId: String(id) } })
}

onMounted(async () => {
  try {
    const tree = await materialApi.listCategories()
    const out: { id: number; name: string; depth: number }[] = []
    walk(Array.isArray(tree) ? tree : [], 0, out)
    flat.value = out
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
.cat-name {
  font-weight: 650;
  font-size: 14px;
}
</style>
