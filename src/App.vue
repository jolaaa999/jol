<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import FluidBackdrop from '@/components/ui/FluidBackdrop.vue'
import MechanicalNav from '@/components/MechanicalNav.vue'

const router = useRouter()
const route = useRoute()

/** 入口页与博客共用流体背景 */
const showFluidBackdrop = computed(
  () => route.name === 'entry' || route.name === 'blog',
)

const showMechanicalNav = computed(
  () => route.name === 'blog',
)

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
  <FluidBackdrop v-if="showFluidBackdrop" />
  <div class="app-stage" :class="{ 'app-stage--fluid': showFluidBackdrop }">
    <RouterView />
  </div>
  <MechanicalNav v-if="showMechanicalNav" @navigate="onNavigate" />
</template>

<style scoped>
.app-stage {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
}

.app-stage--fluid {
  color: rgba(255, 255, 255, 0.92);
}
</style>
