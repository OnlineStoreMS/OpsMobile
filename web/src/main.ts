import { createApp } from 'vue'
import {
  ActionSheet,
  Button,
  Calendar,
  Cascader,
  Cell,
  CellGroup,
  Empty,
  Field,
  Form,
  Icon,
  List,
  Loading,
  NavBar,
  NoticeBar,
  Popup,
  Radio,
  RadioGroup,
  Search,
  Switch,
  Tag,
  Toast,
  Dialog,
  Uploader,
  ImagePreview,
  showToast,
  showSuccessToast,
  showFailToast,
  showLoadingToast,
  showImagePreview,
  closeToast,
} from 'vant'
import 'vant/lib/index.css'
import App from './App.vue'
import router from './router'
import { ensureSession, redirectToPortal } from './utils/auth'
import './styles/main.css'

async function boot() {
  const ok = await ensureSession()
  if (!ok) {
    redirectToPortal()
    return
  }

  const app = createApp(App)
  ;[
    ActionSheet,
    Button,
    Calendar,
    Cascader,
    Cell,
    CellGroup,
    Empty,
    Field,
    Form,
    Icon,
    List,
    Loading,
    NavBar,
    NoticeBar,
    Popup,
    Radio,
    RadioGroup,
    Search,
    Switch,
    Tag,
    Toast,
    Dialog,
    Uploader,
    ImagePreview,
  ].forEach((c) => app.use(c))

  app.config.globalProperties.$toast = showToast
  app.provide('toast', {
    showToast,
    showSuccessToast,
    showFailToast,
    showLoadingToast,
    showImagePreview,
    closeToast,
  })

  app.use(router)
  app.mount('#app')
}

void boot()
