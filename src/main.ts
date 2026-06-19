import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/variables.css'
import './styles/main.css'

/** 创建 Vue 应用实例，挂载路由并渲染至 #app */
createApp(App).use(router).mount('#app')