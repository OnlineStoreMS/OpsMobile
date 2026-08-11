import { createApp } from 'vue'
import {
  Button,
  Cell,
  CellGroup,
  Empty,
  Field,
  Form,
  Icon,
  List,
  NavBar,
  NoticeBar,
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
import './styles/main.css'

const app = createApp(App)
;[
  Button,
  Cell,
  CellGroup,
  Empty,
  Field,
  Form,
  Icon,
  List,
  NavBar,
  NoticeBar,
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
