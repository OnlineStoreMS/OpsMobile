<template>
  <div class="page">
    <van-nav-bar title="新建手工单" left-arrow @click-left="router.back()" />

    <template v-if="!created">
      <div class="page-body">
        <van-notice-bar
          left-icon="info-o"
          text="提交后自动分配自营；请到电脑「发货中心」打单发货。"
        />

        <div class="card" style="margin-top: 12px">
          <van-field
            v-model="rawAddress"
            rows="3"
            autosize
            type="textarea"
            label="粘贴地址"
            placeholder="姓名 手机 省市区详细地址"
          />
          <van-button block type="primary" plain size="small" :loading="parsing" @click="onParse">
            智能识别
          </van-button>
        </div>

        <div class="card">
          <van-field v-model="form.buyerName" label="收件人" required placeholder="姓名" />
          <van-field v-model="form.buyerPhone" label="手机" required placeholder="手机号" />
          <van-field v-model="form.buyerTel" label="固话" placeholder="可选" />
          <van-field v-model="form.province" label="省" required placeholder="省" />
          <van-field v-model="form.city" label="市" required placeholder="市" />
          <van-field v-model="form.district" label="区" required placeholder="区/县" />
          <van-field
            v-model="form.detail"
            rows="2"
            autosize
            type="textarea"
            label="详细地址"
            required
            placeholder="街道门牌"
          />
        </div>

        <div class="card">
          <div class="section-head">
            <span>商品</span>
            <van-button size="mini" type="primary" plain @click="addLine">加一行</van-button>
          </div>
          <div v-for="(it, idx) in items" :key="idx" class="item-block">
            <van-field
              v-model="it.productName"
              label="规格"
              required
              placeholder="商品名称 / 规格"
            />
            <div class="item-row">
              <van-field
                v-model.number="it.quantity"
                type="digit"
                label="数量"
                required
                input-align="right"
              />
              <van-field
                v-model="it.priceText"
                type="number"
                label="单价"
                required
                input-align="right"
                placeholder="0"
              />
            </div>
            <div class="item-footer">
              <span class="muted">小计 ¥{{ lineTotal(it).toFixed(2) }}</span>
              <van-button
                v-if="items.length > 1"
                size="mini"
                type="danger"
                plain
                @click="items.splice(idx, 1)"
              >
                删除
              </van-button>
            </div>
          </div>
          <div class="total-row">
            <span>订单合计</span>
            <strong>¥{{ orderTotal.toFixed(2) }}</strong>
          </div>
        </div>

        <div class="card">
          <van-field
            v-model="sourceLabel"
            is-link
            readonly
            label="订单来源"
            :placeholder="sourcesLoading ? '加载中…' : sources.length ? '请选择' : '暂无来源，点此重试'"
            @click="openSourcePicker"
          />
          <div v-if="!sourcesLoading && !sources.length" class="muted" style="padding: 0 12px 8px">
            请在电脑 OrderCore「设置 → 手工订单来源」中先录入
          </div>
          <van-field
            v-model="form.remark"
            rows="2"
            autosize
            type="textarea"
            label="备注"
            placeholder="可选"
          />
        </div>
      </div>

      <div class="action-bar">
        <van-button type="primary" block :loading="submitting" @click="submit">提交</van-button>
      </div>
    </template>

    <div v-else class="page-body">
      <div class="card success-box">
        <van-icon name="checked" color="#16a34a" size="48" />
        <div style="margin-top: 8px; font-weight: 600">建单成功</div>
        <div class="order-no">{{ created.orderNo }}</div>
        <div class="muted">{{ created.tip }}</div>
        <div class="muted" style="margin-top: 12px">请到电脑打开「发货中心」继续打单发货</div>
        <van-button type="primary" block style="margin-top: 20px" @click="resetForm">再建一单</van-button>
        <van-button block plain style="margin-top: 8px" @click="router.replace('/')">返回首页</van-button>
      </div>
    </div>

    <van-action-sheet
      v-model:show="showSourcePicker"
      :actions="sourceActions"
      cancel-text="取消"
      close-on-click-action
      @select="onSourceSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import {
  createManualOrder,
  listManualOrderSources,
  parseManualAddress,
  type ManualOrderSource,
} from '../api/manualOrder'

interface LineItem {
  productName: string
  quantity: number
  priceText: string
}

const router = useRouter()
const rawAddress = ref('')
const parsing = ref(false)
const submitting = ref(false)
const showSourcePicker = ref(false)
const sources = ref<ManualOrderSource[]>([])
const sourcesLoading = ref(false)
const manualSourceId = ref<number | undefined>()
const sourceLabel = ref('')

const form = reactive({
  buyerName: '',
  buyerPhone: '',
  buyerTel: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  remark: '',
})

const items = ref<LineItem[]>([emptyLine()])
const created = ref<{ orderNo: string; tip: string } | null>(null)

const sourceActions = computed(() =>
  sources.value.map((s) => ({ name: s.name, id: s.id })),
)

const orderTotal = computed(() =>
  items.value.reduce((sum, it) => sum + lineTotal(it), 0),
)

function emptyLine(): LineItem {
  return { productName: '', quantity: 1, priceText: '' }
}

function lineTotal(it: LineItem) {
  const qty = Number(it.quantity) || 0
  const price = Number(it.priceText) || 0
  return Math.round(qty * price * 100) / 100
}

function addLine() {
  items.value.push(emptyLine())
}

function onSourceSelect(action: { name: string; id: number }) {
  manualSourceId.value = action.id
  sourceLabel.value = action.name
}

async function openSourcePicker() {
  if (!sources.value.length && !sourcesLoading.value) {
    await loadSources()
  }
  if (!sources.value.length) {
    showFailToast('暂无订单来源，请先在电脑 OrderCore 配置')
    return
  }
  showSourcePicker.value = true
}

async function loadSources() {
  sourcesLoading.value = true
  try {
    const list = await listManualOrderSources()
    sources.value = Array.isArray(list) ? list : []
  } catch (e: any) {
    sources.value = []
    showFailToast(e?.message || '加载订单来源失败')
  } finally {
    sourcesLoading.value = false
  }
}

async function onParse() {
  if (!rawAddress.value.trim()) {
    showFailToast('请先粘贴地址')
    return
  }
  parsing.value = true
  try {
    const parsed = await parseManualAddress(rawAddress.value.trim())
    form.buyerName = parsed.name || form.buyerName
    form.buyerPhone = parsed.phone || form.buyerPhone
    form.buyerTel = parsed.tel || form.buyerTel
    form.province = parsed.address?.province || form.province
    form.city = parsed.address?.city || form.city
    form.district = parsed.address?.district || form.district
    form.detail = parsed.address?.detail || form.detail
    showSuccessToast('已识别')
  } catch (e: any) {
    showFailToast(e.message || '识别失败')
  } finally {
    parsing.value = false
  }
}

async function submit() {
  if (!form.buyerName || (!form.buyerPhone && !form.buyerTel)) {
    showFailToast('请填写收件人与手机/固话')
    return
  }
  if (!form.province || !form.city || !form.district || !form.detail) {
    showFailToast('请填写完整省市区与详细地址')
    return
  }
  const payloadItems = items.value
    .map((it) => ({
      productName: it.productName.trim(),
      skuSpecs: it.productName.trim(),
      quantity: Number(it.quantity) || 0,
      price: Number(it.priceText) || 0,
    }))
    .filter((it) => it.productName)
  if (!payloadItems.length) {
    showFailToast('请至少填写一行商品规格')
    return
  }
  for (const it of payloadItems) {
    if (it.quantity <= 0) {
      showFailToast('数量须大于 0')
      return
    }
  }

  submitting.value = true
  showLoadingToast({ message: '提交中…', forbidClick: true, duration: 0 })
  try {
    const order = await createManualOrder({
      buyerName: form.buyerName,
      buyerPhone: form.buyerPhone,
      buyerTel: form.buyerTel,
      remark: form.remark,
      syncKdzs: true,
      createAction: 'create_and_push',
      manualSourceId: manualSourceId.value || undefined,
      totalAmount: orderTotal.value,
      payAmount: orderTotal.value,
      address: {
        name: form.buyerName,
        phone: form.buyerPhone,
        province: form.province,
        city: form.city,
        district: form.district,
        address: form.detail,
      },
      items: payloadItems,
    })
    closeToast()
    created.value = {
      orderNo: order.orderNo,
      tip: '已创建并分配自营',
    }
  } catch (e: any) {
    closeToast()
    showFailToast(e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  created.value = null
  items.value = [emptyLine()]
  rawAddress.value = ''
  form.buyerName = ''
  form.buyerPhone = ''
  form.buyerTel = ''
  form.province = ''
  form.city = ''
  form.district = ''
  form.detail = ''
  form.remark = ''
  manualSourceId.value = undefined
  sourceLabel.value = ''
}

onMounted(loadSources)
</script>

<style scoped>
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  margin-bottom: 4px;
}
.item-block {
  padding: 8px 0;
  border-bottom: 1px solid #f0f2f5;
}
.item-block:last-of-type {
  border-bottom: none;
}
.item-row {
  display: flex;
  gap: 4px;
}
.item-row :deep(.van-field) {
  flex: 1;
}
.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 8px;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 4px 4px;
  font-size: 15px;
  border-top: 1px solid #f0f2f5;
  margin-top: 4px;
}
.total-row strong {
  color: #e11d48;
  font-size: 18px;
}
</style>
