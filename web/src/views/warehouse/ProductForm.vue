<template>
  <div class="page">
    <van-nav-bar
      class="ops-nav"
      :title="isEdit ? '编辑商品' : '新建商品'"
      left-arrow
      @click-left="router.back()"
    />
    <div class="page-body" v-if="ready">
      <div class="section-label">主图</div>
      <div class="card">
        <van-uploader v-model="picFiles" :max-count="1" :after-read="onPicRead" />
      </div>

      <div class="section-label">基础信息</div>
      <div class="card">
        <van-field v-model="form.parentSku" label="父SKU" required :disabled="isEdit" placeholder="必填" />
        <van-field v-model="form.name" label="商品名称" required placeholder="必填" />
        <van-field
          v-model="categoryLabel"
          is-link
          readonly
          label="类别"
          placeholder="可选"
          @click="showCat = true"
        />
        <van-field
          v-model="warehouseLabel"
          is-link
          readonly
          label="默认仓"
          placeholder="可选"
          @click="showWh = true"
        />
        <van-field v-model="form.remark" label="备注" type="textarea" rows="2" autosize />
      </div>

      <div class="section-label">
        库存 SKU
        <button type="button" class="link-btn" @click="addSku">+ 加一行</button>
      </div>
      <div v-for="(s, idx) in skus" :key="idx" class="card sku-card">
        <van-field v-model="s.skuCode" label="SKU编码" required placeholder="必填" />
        <van-field v-model="s.pickName" label="拣货名" placeholder="可选" />
        <van-field v-model="s.weightG" type="number" label="重量(g)" placeholder="0" />
        <van-field v-model="s.lastPurchasePrice" type="number" label="采购价" placeholder="0" />
        <van-field v-model="s.salePrice" type="number" label="售价" placeholder="0" />
        <van-field v-model="s.upc" label="UPC" placeholder="可选" />
        <van-button v-if="skus.length > 1" size="small" plain type="danger" block @click="skus.splice(idx, 1)">
          删除此 SKU
        </van-button>
      </div>

      <van-collapse v-model="moreOpen">
        <van-collapse-item title="更多字段" name="1">
          <van-field v-model="form.brand" label="品牌" />
          <van-field v-model="form.unit" label="单位" placeholder="如 pcs" />
          <van-field v-model="form.material" label="材质" />
          <van-field v-model="form.model" label="型号" />
          <van-field v-model="form.hsCode" label="HS编码" />
          <van-field v-model="form.originCountryCode" label="原产国" placeholder="如 CN" />
        </van-collapse-item>
      </van-collapse>

      <div class="footer-safe">
        <van-button type="primary" block round :loading="saving" @click="save">保存</van-button>
      </div>
    </div>

    <van-action-sheet
      v-model:show="showCat"
      :actions="catActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickCat"
    />
    <van-action-sheet
      v-model:show="showWh"
      :actions="whActions"
      cancel-text="取消"
      close-on-click-action
      teleport="body"
      @select="onPickWh"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showFailToast, showSuccessToast, type UploaderFileListItem } from 'vant'
import { uploadWarehouseImage, whApi } from '../../api/warehouse'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id && route.params.id !== 'new')
const ready = ref(false)
const saving = ref(false)
const moreOpen = ref<string[]>([])
const picFiles = ref<UploaderFileListItem[]>([])
const categories = ref<any[]>([])
const warehouses = ref<any[]>([])
const showCat = ref(false)
const showWh = ref(false)

const form = reactive<any>({
  parentSku: '',
  name: '',
  categoryId: 0,
  defaultWarehouseId: 0,
  remark: '',
  pic: '',
  status: 1,
  defaultProductType: 'normal',
  brand: '',
  unit: '',
  material: '',
  model: '',
  hsCode: '',
  originCountryCode: '',
})

const skus = ref<any[]>([emptySku()])

function emptySku() {
  return {
    id: undefined,
    skuCode: '',
    pickName: '',
    weightG: '',
    lastPurchasePrice: '',
    salePrice: '',
    upc: '',
    status: 'active',
    productType: 'normal',
    goodsKind: 'normal',
  }
}

const categoryLabel = computed(() => {
  const c = categories.value.find((x) => x.id === form.categoryId)
  return c?.name || ''
})
const warehouseLabel = computed(() => {
  const w = warehouses.value.find((x) => x.id === form.defaultWarehouseId)
  return w?.name || ''
})
const catActions = computed(() => [
  { name: '不选类别', id: 0 },
  ...categories.value.map((c) => ({ name: c.name, id: c.id })),
])
const whActions = computed(() => [
  { name: '不选仓库', id: 0 },
  ...warehouses.value.map((w) => ({ name: w.name, id: w.id })),
])

function onPickCat(a: { id: number }) {
  form.categoryId = a.id || 0
}
function onPickWh(a: { id: number }) {
  form.defaultWarehouseId = a.id || 0
}
function addSku() {
  skus.value.push(emptySku())
}

async function onPicRead(item: UploaderFileListItem | UploaderFileListItem[]) {
  const fileItem = Array.isArray(item) ? item[0] : item
  if (!fileItem?.file) return
  fileItem.status = 'uploading'
  try {
    const up = await uploadWarehouseImage(fileItem.file, 'products')
    fileItem.url = up.url
    form.pic = up.url
    fileItem.status = 'done'
  } catch (e: any) {
    fileItem.status = 'failed'
    showFailToast(e.message || '上传失败')
  }
}

async function save() {
  if (!form.parentSku.trim() || !form.name.trim()) {
    showFailToast('请填写父SKU与商品名称')
    return
  }
  const validSkus = skus.value.filter((s) => String(s.skuCode || '').trim())
  if (!validSkus.length) {
    showFailToast('请至少填写一条库存SKU')
    return
  }
  saving.value = true
  try {
    const body = {
      ...form,
      parentSku: form.parentSku.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId || 0,
      defaultWarehouseId: form.defaultWarehouseId || 0,
      pic: form.pic || '',
      status: form.status ?? 1,
      defaultProductType: 'normal',
      skus: validSkus.map((s) => ({
        id: s.id || undefined,
        skuCode: String(s.skuCode).trim(),
        pickName: s.pickName || '',
        status: s.status || 'active',
        productType: 'normal',
        goodsKind: 'normal',
        weightG: Number(s.weightG) || 0,
        lastPurchasePrice: Number(s.lastPurchasePrice) || 0,
        salePrice: Number(s.salePrice) || 0,
        upc: s.upc || '',
      })),
    }
    if (isEdit.value) {
      await whApi.updateProductWithSkus(Number(route.params.id), body)
    } else {
      await whApi.createProductWithSkus(body)
    }
    showSuccessToast('已保存')
    router.replace('/warehouse/products')
  } catch (e: any) {
    showFailToast(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const [cats, whs] = await Promise.all([
      whApi.listCategories({ page: 1, pageSize: 200 }),
      whApi.listWarehouses({ page: 1, pageSize: 100 }),
    ])
    categories.value = cats.list || []
    warehouses.value = whs.list || []
    if (isEdit.value) {
      const p = await whApi.getProduct(Number(route.params.id))
      Object.assign(form, {
        parentSku: p.parentSku || p.parent_sku || '',
        name: p.name || '',
        categoryId: p.categoryId || p.category_id || 0,
        defaultWarehouseId: p.defaultWarehouseId || p.default_warehouse_id || 0,
        remark: p.remark || '',
        pic: p.pic || '',
        status: p.status ?? 1,
        brand: p.brand || '',
        unit: p.unit || '',
        material: p.material || '',
        model: p.model || '',
        hsCode: p.hsCode || p.hs_code || '',
        originCountryCode: p.originCountryCode || p.origin_country_code || '',
      })
      if (p.pic) picFiles.value = [{ url: p.pic, status: 'done', isImage: true }]
      const skuList = p.skus || p.Skus || []
      skus.value = skuList.length
        ? skuList.map((s: any) => ({
            id: s.id,
            skuCode: s.skuCode || s.sku_code || '',
            pickName: s.pickName || s.pick_name || '',
            weightG: String(s.weightG ?? s.weight_g ?? ''),
            lastPurchasePrice: String(s.lastPurchasePrice ?? s.last_purchase_price ?? ''),
            salePrice: String(s.salePrice ?? s.sale_price ?? ''),
            upc: s.upc || '',
            status: s.status || 'active',
          }))
        : [emptySku()]
    } else {
      skus.value = [emptySku()]
    }
  } catch (e: any) {
    showFailToast(e.message || '加载失败')
  } finally {
    ready.value = true
  }
})
</script>

<style scoped>
.link-btn {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--ops-primary);
  font-size: 13px;
  font-weight: 650;
}
.sku-card {
  margin-bottom: 10px;
}
.footer-safe {
  position: sticky;
  bottom: 0;
  padding: 12px 0 calc(12px + var(--ops-safe-bottom));
  background: linear-gradient(180deg, transparent, #e8eef2 30%);
}
</style>
