<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRouter, useRoute } from 'vue-router'
import FluidBackdrop from '@/components/ui/FluidBackdrop.vue'
import MechanicalNav from '@/components/MechanicalNav.vue'
import CommandPalette from '@/components/ui/CommandPalette.vue'
import { useTheme } from '@/composables/useTheme'
import { SITE } from '@/data/site'
import { useSeo } from '@/composables/useSeo'

const router = useRouter()
const route = useRoute()
const { initTheme } = useTheme()

initTheme()
useSeo()

const fluidRoutes = new Set(['entry', 'blog', 'blog-post', 'blog-tag'])

const showFluidBackdrop = computed(() =>
  route.name != null && fluidRoutes.has(route.name as string),
)

const showMechanicalNav = computed(() =>
  route.name === 'blog' || route.name === 'blog-post' || route.name === 'blog-tag',
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
  <CommandPalette />

  <component
    :is="'script'"
    v-if="SITE.umami.websiteId && SITE.umami.src"
    defer
    :src="SITE.umami.src"
    :data-website-id="SITE.umami.websiteId"
  />
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
