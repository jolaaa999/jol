<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import MechanicalNav from '@/components/MechanicalNav.vue'

const router = useRouter()

function onNavigate(to: string): void {
  const hashIdx = to.indexOf('#')
  if (hashIdx === -1) {
    router.push(to)
    return
  }
  const path = to.slice(0, hashIdx)
  const hash = to.slice(hashIdx)
  router.push({ path, hash }).then(() => {
    const el = document.querySelector(hash)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}
</script>

<template>
  <RouterView />
  <MechanicalNav @navigate="onNavigate" />
</template>
