<template>
  <div class="page">
    <van-nav-bar class="ops-nav" title="DeepSeek 设置" left-arrow @click-left="router.back()" />
    <div v-if="ready && form" class="page-body">
      <div class="section-label">总开关</div>
      <div class="card">
        <van-cell center title="启用 DeepSeek 回复">
          <template #right-icon>
            <van-switch v-model="form.enabled" size="20px" />
          </template>
        </van-cell>
        <p class="form-tip">
          {{ form.configured ? '已配置 API Key，关键词未命中时走模型。' : '服务端尚未配置 API Key，开启后也无法真正调用。' }}
        </p>
      </div>

      <div class="section-label">提示词</div>
      <div class="card">
        <van-field v-model="form.styleHint" label="风格提示" maxlength="120" placeholder="如：简洁礼貌" />
        <van-field
          v-model="form.systemPrompt"
          label="系统提示词"
          type="textarea"
          rows="5"
          autosize
          placeholder="留空则用默认提示词"
        />
        <p v-if="form.defaultSystemPrompt" class="form-tip">默认：{{ form.defaultSystemPrompt }}</p>
      </div>

      <div class="section-label">模型参数</div>
      <div class="card">
        <van-field v-model="form.model" label="模型" placeholder="deepseek-chat" />
        <van-field v-model="maxCharsText" type="digit" label="最大字数" />
        <van-field v-model="maxTokensText" type="digit" label="Max Tokens" />
        <van-field v-model="timeoutText" type="digit" label="超时秒数" />
        <van-field v-model="temperatureText" type="number" label="温度" />
        <van-field v-model="historyText" type="digit" label="历史条数" />
        <van-field v-model="inboundText" type="digit" label="入站截断字数" />
        <van-field v-model="cooldownText" type="digit" label="冷却秒数" />
      </div>

      <div class="section-label">上下文</div>
      <div class="card">
        <van-cell center title="思考模式">
          <template #right-icon>
            <van-switch v-model="form.thinkingEnabled" size="20px" />
          </template>
        </van-cell>
        <van-cell center title="带商品上下文">
          <template #right-icon>
            <van-switch v-model="form.useProductContext" size="20px" />
          </template>
        </van-cell>
        <van-cell center title="卡住时重试">
          <template #right-icon>
            <van-switch v-model="form.retryStall" size="20px" />
          </template>
        </van-cell>
      </div>

      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="save">保存设置</van-button>
      </div>
    </div>
    <van-loading v-else class="page-loading" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { csApi, type CsLlmSetting } from '../../api/cs'

const router = useRouter()
const ready = ref(false)
const saving = ref(false)
const form = ref<CsLlmSetting | null>(null)

function numField(key: 'maxChars' | 'maxTokens' | 'timeoutSec' | 'historyCount' | 'inboundMaxChars' | 'cooldownSec') {
  return computed({
    get: () => String(form.value?.[key] ?? ''),
    set: (v: string) => {
      if (!form.value) return
      form.value[key] = Number(v || 0)
    },
  })
}

const maxCharsText = numField('maxChars')
const maxTokensText = numField('maxTokens')
const timeoutText = numField('timeoutSec')
const historyText = numField('historyCount')
const inboundText = numField('inboundMaxChars')
const cooldownText = numField('cooldownSec')

const temperatureText = computed({
  get: () => String(form.value?.temperature ?? ''),
  set: (v: string) => {
    if (!form.value) return
    form.value.temperature = Number(v || 0)
  },
})

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    const next = await csApi.saveLlmSetting({
      enabled: form.value.enabled,
      styleHint: form.value.styleHint,
      cooldownSec: form.value.cooldownSec,
      systemPrompt: form.value.systemPrompt,
      model: form.value.model,
      maxChars: form.value.maxChars,
      maxTokens: form.value.maxTokens,
      timeoutSec: form.value.timeoutSec,
      temperature: form.value.temperature,
      thinkingEnabled: form.value.thinkingEnabled,
      historyCount: form.value.historyCount,
      inboundMaxChars: form.value.inboundMaxChars,
      useProductContext: form.value.useProductContext,
      retryStall: form.value.retryStall,
    })
    form.value = next
    showSuccessToast('已保存')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    form.value = await csApi.getLlmSetting()
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.form-tip {
  margin: 0 16px 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ops-muted);
}
.footer-safe {
  padding: 8px 16px calc(12px + var(--ops-safe-bottom));
}
.page-loading {
  padding-top: 48px;
}
</style>
