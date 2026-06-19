import { createRouter, createWebHistory } from 'vue-router'

/** 应用路由实例 */
const router = createRouter({
  history: createWebHistory(),
  /** 路由表：落地页 + 博客壳层子路由 */
  routes: [
    {
      path: '/',
      name: 'landing',
      /** 异步加载落地页组件 */
      component: () => import('@/views/Landing.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/blog',
      /** 异步加载应用壳层布局 */
      component: () => import('@/components/layout/AppShell.vue'),
      meta: { layout: 'shell' },
      children: [
        {
          path: '',
          name: 'blog',
          /** 异步加载博客主页组件 */
          component: () => import('@/views/BlogLayout.vue'),
        },
      ],
    },
  ],
  /** 路由切换时滚动至页面顶部 */
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
