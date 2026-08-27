import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import router from './router'
import 'highlight.js/styles/github-dark.min.css'
import './styles/variables.css'
import './styles/main.css'

/** 创建 Vue 应用实例，挂载路由并渲染至 #app */
const app = createApp(App)
app.use(createHead())
app.use(router)
app.mount('#app')