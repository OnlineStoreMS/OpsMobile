<template>
  <div class="page">
    <van-nav-bar class="ops-nav" :title="editingId ? '编辑店铺' : '添加店铺'" left-arrow @click-left="router.back()" />
    <div v-if="ready" class="page-body">
      <div class="section-label">基本信息</div>
      <div class="card">
        <van-field v-model="form.name" label="店铺名称" required maxlength="80" placeholder="必填" />
        <van-field
          v-if="!editingId"
          :model-value="platformLabel"
          is-link
          readonly
          label="平台"
          @click="showPlatform = true"
        />
        <van-field
          v-if="!editingId"
          v-model="form.platformShopId"
          label="平台店铺 ID"
          maxlength="64"
          placeholder="可选"
        />
        <van-field
          v-if="!editingId"
          v-model="form.platformShopName"
          label="平台店铺名"
          maxlength="80"
          placeholder="可选"
        />
        <van-field
          v-model="form.remark"
          label="备注"
          type="textarea"
          rows="2"
          autosize
          maxlength="200"
          placeholder="可选"
        />
      </div>
      <p v-if="!editingId" class="form-tip">创建后会生成绑定码，拿去 Windows 插件绑定抖店飞鸽。</p>
      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="save">
          {{ editingId ? '保存' : '创建' }}
        </van-button>
      </div>
    </div>
    <van-loading v-else class="page-loading" />

    <van-action-sheet
      v-model:show="showPlatform"
      :actions="platformActions"
      cancel-text="取消"
      close-on-click-action
      @select="onPickPlatform"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast } from 'vant'
import { csApi } from '../../api/cs'

const route = useRoute()
const router = useRouter()
const ready = ref(false)
const saving = ref(false)
const editingId = ref(0)
const showPlatform = ref(false)

const form = reactive({
  name: '',
  platform: 'doudian',
  platformShopId: '',
  platformShopName: '',
  remark: '',
})

const platformActions = [{ name: '抖店', value: 'doudian' }]

const platformLabel = computed(() => (form.platform === 'doudian' ? '抖店' : form.platform))

function onPickPlatform(act: { value?: string }) {
  if (act.value) form.platform = act.value
}

async function save() {
  if (!form.name.trim()) {
    showFailToast('请填写店铺名称')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await csApi.updateShop(editingId.value, {
        name: form.name.trim(),
        remark: form.remark.trim(),
      })
      showSuccessToast('已保存')
    } else {
      await csApi.createShop({
        name: form.name.trim(),
        platform: form.platform,
        platformShopId: form.platformShopId.trim(),
        platformShopName: form.platformShopName.trim(),
        remark: form.remark.trim(),
      })
      showSuccessToast('已创建')
    }
    router.replace('/customer-service/shops')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const id = Number(route.params.id)
    if (id) {
      editingId.value = id
      const row = await csApi.getShop(id)
      form.name = row.name
      form.platform = row.platform
      form.platformShopId = row.platformShopId || ''
      form.platformShopName = row.platformShopName || ''
      form.remark = row.remark || ''
    }
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.form-tip {
  margin: 0 16px 10px;
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
