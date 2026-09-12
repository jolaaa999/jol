import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './styles/main.css'
import './styles/theme-light.css'

/** 创建 Vue 应用实例，挂载路由并渲染至 #app */
const app = createApp(App)
app.use(createHead())
app.use(router)
app.mount('#app')