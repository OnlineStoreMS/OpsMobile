<template>
  <div class="main-shell">
    <TenantSwitchSheet />

    <!-- N 个顶层大页：左右滑切换（配置见 hubPages.ts） -->
    <div v-show="isHub" class="hub-pager">
      <van-swipe
        ref="swipeRef"
        class="hub-swipe"
        :loop="false"
        :show-indicators="false"
        :touchable="true"
        :initial-swipe="hubIndex"
        @change="onHubChange"
      >
        <van-swipe-item v-for="hub in hubPages" :key="`${tenantKey}-${hub.path}`">
          <div class="hub-pane">
            <component :is="hub.component" />
          </div>
        </van-swipe-item>
      </van-swipe>

      <div class="hub-indicator" aria-hidden="true">
        <i
          v-for="(hub, i) in hubPages"
          :key="hub.path"
          :class="{ on: hubIndex === i }"
          @click="goHub(i)"
        />
      </div>
    </div>

    <!-- 子页栈：推进 / 返回左右滑 -->
    <div v-if="!isHub" class="deep-layer" :class="{ 'deep-layer--locking': slideLocking }">
      <router-view v-slot="{ Component, route: r }">
        <transition
          :name="transitionName"
          @before-enter="onSlideLock"
          @after-enter="onSlideUnlock"
          @after-leave="onSlideUnlock"
        >
          <component :is="Component" :key="`${tenantKey}-${r.fullPath}`" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { SwipeInstance } from 'vant'
import TenantSwitchSheet from '../components/TenantSwitchSheet.vue'
import { useSession } from '../composables/useSession'
import { hubIndexByPath, hubPages, isHubPath } from '../hubPages'

const route = useRoute()
const router = useRouter()
const { session, load } = useSession()
const swipeRef = ref<SwipeInstance>()
const hubIndex = ref(hubIndexByPath(route.path))

const tenantKey = computed(() => session.value?.tenant.id ?? 0)

const isHub = computed(() => Boolean(route.meta.hub) || isHubPath(route.path))

const transitionName = ref('fade-tab')
/** 仅动画期间锁定父层 overflow，结束后必须放开，否则子页无法下滑 */
const slideLocking = ref(false)

function onSlideLock() {
  if (transitionName.value.startsWith('slide-')) {
    slideLocking.value = true
  }
}

function onSlideUnlock() {
  slideLocking.value = false
}

function histPos() {
  return (window.history.state as { position?: number } | null)?.position
}
let lastPos = histPos() ?? 0

function depthOf(path: string) {
  if (!path || path === '/') return 0
  return path.split('/').filter(Boolean).length
}

function applyHub(index: number, replaceRoute: boolean) {
  const hub = hubPages[index]
  if (!hub) return
  hubIndex.value = index
  document.title = hub.title
  if (replaceRoute && route.path !== hub.path) {
    router.replace(hub.path)
  }
}

function syncSwipeToRoute() {
  const idx = hubIndexByPath(route.path)
  hubIndex.value = idx
  nextTick(() => {
    swipeRef.value?.swipeTo(idx)
  })
}

function onHubChange(index: number) {
  applyHub(index, true)
}

function goHub(index: number) {
  if (index < 0 || index >= hubPages.length || index === hubIndex.value) return
  swipeRef.value?.swipeTo(index)
  applyHub(index, true)
}

watch(
  () => route.path,
  (path) => {
    if (!isHubPath(path)) return
    const idx = hubIndexByPath(path)
    if (idx !== hubIndex.value) {
      hubIndex.value = idx
      nextTick(() => swipeRef.value?.swipeTo(idx))
    }
    document.title = hubPages[idx]?.title || document.title
  },
)

watch(isHub, (hub) => {
  if (hub) {
    slideLocking.value = false
    syncSwipeToRoute()
  }
})

router.beforeEach((to, from) => {
  const toHub = Boolean(to.meta.hub)
  const fromHub = Boolean(from.meta.hub)

  if (!from.name || (toHub && fromHub)) {
    transitionName.value = 'fade-tab'
    return
  }

  const pos = histPos()
  if (typeof pos === 'number') {
    if (pos < lastPos) {
      transitionName.value = 'slide-right'
      return
    }
    if (pos > lastPos) {
      transitionName.value = 'slide-left'
      return
    }
  }

  if (!toHub && fromHub) {
    transitionName.value = 'slide-left'
    return
  }
  if (toHub && !fromHub) {
    transitionName.value = 'slide-right'
    return
  }

  transitionName.value =
    depthOf(to.path) >= depthOf(from.path) ? 'slide-left' : 'slide-right'
})

router.afterEach(() => {
  lastPos = histPos() ?? lastPos
})

onMounted(() => {
  void load(true)
})
</script>

<style scoped>
.main-shell {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  position: relative;
}

.hub-pager {
  height: 100%;
  position: relative;
}

.hub-swipe {
  height: 100%;
}
.hub-swipe :deep(.van-swipe__track) {
  height: 100%;
}
.hub-swipe :deep(.van-swipe-item) {
  height: 100%;
  overflow: hidden;
}

.hub-pane {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.hub-indicator {
  position: absolute;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  pointer-events: auto;
}
.hub-indicator i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(11, 31, 42, 0.22);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
  transition: transform 0.2s ease, background 0.2s ease, width 0.2s ease;
  flex-shrink: 0;
  cursor: pointer;
}
.hub-indicator i.on {
  width: 16px;
  border-radius: 999px;
  background: rgba(11, 31, 42, 0.55);
  box-shadow: none;
}

.deep-layer {
  height: 100%;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
/* 左右滑动画中短暂锁滚动，避免双层滚动；动画结束后恢复 */
.deep-layer--locking {
  overflow: hidden;
}
</style>
