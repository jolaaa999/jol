<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import MechanicalNav from '@/components/MechanicalNav.vue'

/** Vue Router 实例 */
const router = useRouter()

/** 处理机械导航跳转，支持 hash 锚点平滑滚动 */
function onNavigate(to: string): void {
  /** 目标路径中 hash 片段的起始索引 */
  const hashIdx = to.indexOf('#')
  if (hashIdx === -1) {
    router.push(to)
    return
  }
  /** 路由路径（不含 hash） */
  const path = to.slice(0, hashIdx)
  /** hash 锚点选择器 */
  const hash = to.slice(hashIdx)
  router.push({ path, hash }).then(() => {
    /** 锚点对应的目标 DOM 元素 */
    const el = document.querySelector(hash)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <RouterView />
  <MechanicalNav @navigate="onNavigate" />
</template>
