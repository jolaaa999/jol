import { createRouter, createWebHistory } from 'vue-router'

/** 应用路由实例 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/entry',
    },
    {
      path: '/entry',
      name: 'entry',
      component: () => import('@/views/EntryPage.vue'),
      meta: { layout: 'blank' },
    },
    {
      path: '/blog',
      component: () => import('@/components/layout/AppShell.vue'),
      meta: { layout: 'shell' },
      children: [
        {
          path: '',
          name: 'blog',
          component: () => import('@/views/BlogLayout.vue'),
        },
        {
          path: 'post/:id',
          name: 'blog-post',
          component: () => import('@/views/ArticleView.vue'),
        },
        {
          path: 'tag/:tag',
          name: 'blog-tag',
          component: () => import('@/views/TagArchiveView.vue'),
        },
      ],
    },
    /* 蒲公英落地页与诗词解锁 — 暂时隐藏，保留文件供后续启用 */
    // {
    //   path: '/landing',
    //   name: 'landing',
    //   component: () => import('@/views/Landing.vue'),
    //   meta: { layout: 'blank' },
    // },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve({
            el: to.hash,
            top: 80,
            behavior: 'smooth',
          })
        })
      })
    }
    return { top: 0 }
  },
})

export default router
