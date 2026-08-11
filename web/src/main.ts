import { createApp } from 'vue'
import {
  ActionSheet,
  Button,
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
  showToast,
  showSuccessToast,
  showFailToast,
  showLoadingToast,
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
  ].forEach((c) => app.use(c))

  app.config.globalProperties.$toast = showToast
  app.provide('toast', { showToast, showSuccessToast, showFailToast, showLoadingToast, closeToast })

  app.use(router)
  app.mount('#app')
}

void boot()
