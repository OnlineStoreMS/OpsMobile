<template>
  <div class="page">
    <van-nav-bar title="新建手工单" left-arrow @click-left="router.back()" />

    <template v-if="!created">
      <div class="page-body">
        <van-notice-bar
          left-icon="info-o"
          text="手机建单后请到电脑发货中心打单；「创建并打印」仅记录打单方式。"
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
          <van-field v-model="form.province" label="省" placeholder="省" />
          <van-field v-model="form.city" label="市" placeholder="市" />
          <van-field v-model="form.district" label="区" placeholder="区/县" />
          <van-field
            v-model="form.detail"
            rows="2"
            autosize
            type="textarea"
            label="详细地址"
            placeholder="街道门牌"
          />
        </div>

        <div class="card">
          <div style="font-weight: 600; margin-bottom: 8px">商品</div>
          <van-search
            v-model="productKeyword"
            placeholder="搜索 PIM 商品"
            show-action
            @search="searchProducts"
          >
            <template #action>
              <div @click="searchProducts">搜索</div>
            </template>
          </van-search>
          <div v-if="productHits.length" class="muted" style="margin: 8px 0">点击加入</div>
          <div
            v-for="(p, idx) in productHits"
            :key="idx"
            class="goods-row"
            style="cursor: pointer"
            @click="addProduct(p)"
          >
            <img v-if="p.pic" :src="p.pic" alt="" />
            <div class="goods-info">
              <div class="goods-name">{{ p.productName }}</div>
              <div class="muted">{{ p.specLabel || p.skuCode }} · ¥{{ p.price ?? 0 }}</div>
            </div>
          </div>

          <div v-if="items.length" style="margin-top: 8px">
            <div v-for="(it, idx) in items" :key="idx" class="goods-row">
              <img v-if="it.picUrl" :src="it.picUrl" alt="" />
              <div class="goods-info">
                <div class="goods-name">{{ it.productName }}</div>
                <div class="muted">{{ it.skuSpecs || it.skuCode }}</div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px">
                  <van-field
                    v-model.number="it.quantity"
                    type="digit"
                    label="数量"
                    style="padding: 0; flex: 1"
                  />
                  <van-field
                    v-model.number="it.price"
                    type="number"
                    label="单价"
                    style="padding: 0; flex: 1"
                  />
                  <van-button size="mini" type="danger" plain @click="items.splice(idx, 1)">删</van-button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="muted" style="padding: 8px 0">可搜索添加商品，或仅填发货内容</div>
        </div>

        <div class="card">
          <van-field
            v-model="form.shipContent"
            rows="2"
            autosize
            type="textarea"
            label="发货内容"
            placeholder="无商品时可填写"
          />
          <van-field
            v-model="form.remark"
            rows="2"
            autosize
            type="textarea"
            label="备注"
            placeholder="买家/卖家备注"
          />
          <van-cell title="同步快递助手" center>
            <template #right-icon>
              <van-switch v-model="form.syncKdzs" size="20px" />
            </template>
          </van-cell>
          <div class="muted" style="padding: 0 12px 8px">
            自建物流打印时忽略此开关；账号取发货中心默认快递助手账号
          </div>
        </div>

        <div class="card">
          <div style="font-weight: 600; margin-bottom: 8px">打单方式（创建并打印时生效）</div>
          <van-radio-group v-model="printMode" direction="horizontal">
            <van-radio name="carrier">自建物流</van-radio>
            <van-radio name="kdzs">快递助手</van-radio>
          </van-radio-group>
        </div>
      </div>

      <div class="action-bar">
        <van-button type="warning" block :loading="submitting" @click="submit('create_only')">
          仅创建
        </van-button>
        <van-button type="primary" block :loading="submitting" @click="submit('create_and_push')">
          创建并推送
        </van-button>
        <van-button type="success" block :loading="submitting" @click="submit('create_and_print')">
          创建并打印
        </van-button>
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
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showFailToast, showLoadingToast, showSuccessToast, closeToast } from 'vant'
import { createManualOrder, parseManualAddress, searchPIMProducts } from '../api/manualOrder'

type CreateAction = 'create_only' | 'create_and_push' | 'create_and_print'
type PrintMode = 'kdzs' | 'carrier'

const router = useRouter()
const rawAddress = ref('')
const parsing = ref(false)
const submitting = ref(false)
const productKeyword = ref('')
const productHits = ref<Array<{
  productName?: string
  skuId?: number
  skuCode?: string
  specLabel?: string
  price?: number
  pic?: string
}>>([])
const printMode = ref<PrintMode>('carrier')

const form = reactive({
  buyerName: '',
  buyerPhone: '',
  buyerTel: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  remark: '',
  shipContent: '',
  syncKdzs: true,
})

const items = ref<Array<{
  productName: string
  skuCode: string
  skuSpecs: string
  skuId?: number
  picUrl: string
  quantity: number
  price: number
}>>([])

const created = ref<{ orderNo: string; tip: string } | null>(null)

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
    if (parsed.shipContent) form.shipContent = parsed.shipContent
    showSuccessToast('已识别')
  } catch (e: any) {
    showFailToast(e.message || '识别失败')
  } finally {
    parsing.value = false
  }
}

async function searchProducts() {
  const kw = productKeyword.value.trim()
  if (!kw) return
  try {
    const res = await searchPIMProducts(kw)
    productHits.value = res.list || []
    if (!productHits.value.length) showFailToast('无匹配商品')
  } catch (e: any) {
    showFailToast(e.message || '搜索失败')
  }
}

function addProduct(p: (typeof productHits.value)[0]) {
  items.value.push({
    productName: p.productName || '',
    skuCode: p.skuCode || '',
    skuSpecs: p.specLabel || '',
    skuId: p.skuId,
    picUrl: p.pic || '',
    quantity: 1,
    price: Number(p.price || 0),
  })
  showSuccessToast('已加入')
}

async function submit(action: CreateAction) {
  if (!form.buyerName || (!form.buyerPhone && !form.buyerTel)) {
    showFailToast('请填写收件人与手机/固话')
    return
  }
  if (!form.detail && !form.province) {
    showFailToast('请填写地址')
    return
  }
  const payloadItems = items.value
    .filter((i) => i.productName.trim())
    .map((i) => ({
      productName: i.productName,
      skuCode: i.skuCode,
      skuSpecs: i.skuSpecs,
      skuId: i.skuId,
      picUrl: i.picUrl,
      quantity: i.quantity || 1,
      price: i.price || 0,
    }))
  const shipContent = payloadItems.length ? '' : (form.shipContent || '').trim()
  const mode = action === 'create_and_print' ? printMode.value : undefined
  const syncKdzs = mode === 'carrier' ? false : form.syncKdzs

  submitting.value = true
  showLoadingToast({ message: '提交中…', forbidClick: true, duration: 0 })
  try {
    const order = await createManualOrder({
      buyerName: form.buyerName,
      buyerPhone: form.buyerPhone,
      buyerTel: form.buyerTel,
      remark: form.remark,
      shipContent,
      syncKdzs,
      createAction: action,
      printMode: mode,
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
    let tip = '已创建到待推单'
    if (action === 'create_and_push') tip = syncKdzs ? '已创建并推送（自营）' : '已创建并分配自营'
    if (action === 'create_and_print') {
      tip = mode === 'carrier' ? '已创建（自建物流打单）' : '已创建（快递助手打单）'
    }
    created.value = { orderNo: order.orderNo, tip }
  } catch (e: any) {
    closeToast()
    showFailToast(e.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  created.value = null
  items.value = []
  productHits.value = []
  rawAddress.value = ''
  printMode.value = 'carrier'
}
</script>
