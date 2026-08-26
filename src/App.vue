<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import MechanicalNav from '@/components/MechanicalNav.vue'

/** Vue Router 实例 */
const router = useRouter()
/** 当前路由 */
const route = useRoute()

/** 沉浸式页面不显示浮动机械导航 */
const showMechanicalNav = computed(
  () => route.name !== 'landing' && route.name !== 'entry',
)

/** 处理机械导航跳转（hash 滚动由 router scrollBehavior 统一处理） */
function onNavigate(to: string): void {
  const hashIdx = to.indexOf('#')
  if (hashIdx === -1) {
    router.push(to)
    return
  }
  const path = to.slice(0, hashIdx)
  const hash = to.slice(hashIdx)
  router.push({ path, hash })
}
</script>

<template>
  <RouterView />
  <MechanicalNav v-if="showMechanicalNav" @navigate="onNavigate" />
</template>
