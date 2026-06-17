import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/Landing.vue'),
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
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
