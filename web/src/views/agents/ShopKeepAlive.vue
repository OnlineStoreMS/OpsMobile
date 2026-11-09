<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="店铺保活" left-arrow @click-left="router.back()">
      <template #right>
        <span class="nav-link" @click="load">刷新</span>
      </template>
    </van-nav-bar>
    <div class="list-shell">
      <p class="list-hint">
        Agent 在店铺登录失效时会自动填手机号并发送验证码。收到短信后在此填入点「发送」，Agent 会自动登录。验证码 5 分钟有效。
      </p>
      <van-list :loading="loading" :finished="true" finished-text="">
        <div v-for="row in sorted" :key="row.id" class="order-card" :class="{ urgent: canSendKeepAliveOtp(row) }">
          <div class="order-card__top">
            <div class="order-card__no">{{ row.platformShopName || row.platformShopId || '未命名店铺' }}</div>
            <van-tag plain :type="row.agentOnline ? 'success' : 'default'">
              {{ row.agentOnline ? '节点在线' : '节点离线' }}
            </van-tag>
          </div>
          <div class="muted">{{ platformLabel(row.platform) }} · {{ row.shopPhone || '未配手机号' }}</div>
          <div class="muted">节点 {{ row.agentName || '—' }}</div>
          <div v-if="row.keepAliveHint" class="hint" :class="{ wait: canSendKeepAliveOtp(row) }">
            {{ row.keepAliveHint }}
          </div>
          <div v-else class="muted">暂无需验证码</div>
          <div class="otp-row" @click.stop>
            <van-field
              v-model="codes[row.id]"
              type="digit"
              maxlength="8"
              placeholder="短信验证码"
              :disabled="!canSendKeepAliveOtp(row)"
              class="otp-field"
            />
            <van-button
              type="primary"
              size="small"
              :loading="!!sending[row.id]"
              :disabled="!canSendKeepAliveOtp(row)"
              @click="send(row)"
            >
              发送
            </van-button>
          </div>
        </div>
        <van-empty v-if="!loading && !list.length" description="暂无店铺会话" />
      </van-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { agentsApi, canSendKeepAliveOtp, platformLabel, type ShopItem } from '../../api/agents'

const router = useRouter()
const loading = ref(false)
const sending = reactive<Record<number, boolean>>({})
const list = ref<ShopItem[]>([])
const codes = reactive<Record<number, string>>({})
let timer: ReturnType<typeof setInterval> | null = null

const sorted = computed(() => {
  const rows = [...list.value]
  rows.sort((a, b) => Number(canSendKeepAliveOtp(b)) - Number(canSendKeepAliveOtp(a)))
  return rows
})

async function load() {
  loading.value = true
  try {
    const res = await agentsApi.listShops({ page: 1, pageSize: 200 })
    list.value = res.list || []
  } catch (e: any) {
    showFailToast(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function send(row: ShopItem) {
  const code = String(codes[row.id] || '').replace(/\D/g, '')
  if (code.length < 4) {
    showFailToast('请填写验证码')
    return
  }
  sending[row.id] = true
  try {
    await agentsApi.sendShopOtp(row.id, code)
    showSuccessToast('已发送到 Agent，将自动填入并登录')
    codes[row.id] = ''
    await load()
  } catch (e: any) {
    showFailToast(e?.message || '发送失败')
  } finally {
    sending[row.id] = false
  }
}

onMounted(() => {
  void load()
  timer = setInterval(() => {
    void load()
  }, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.list-hint {
  margin: 0 16px 8px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-ink-soft);
}
.muted {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ops-muted);
}
.hint {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ops-muted);
}
.hint.wait {
  color: #e11d48;
  font-weight: 650;
}
.order-card.urgent {
  box-shadow: 0 0 0 1px rgba(225, 29, 72, 0.35);
}
.otp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--ops-line);
}
.otp-field {
  flex: 1;
  padding: 0;
  background: transparent;
}
.otp-field :deep(.van-field__control) {
  font-size: 16px;
  letter-spacing: 0.12em;
}
</style>
