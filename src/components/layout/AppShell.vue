<script setup lang="ts">
import { onMounted, ref } from 'vue'
import gsap from 'gsap'
import NavBar from './NavBar.vue'
import { usePageTransition } from '@/composables/usePageTransition'

const shellRef = ref<HTMLElement | null>(null)
const { isFromEntry } = usePageTransition()

onMounted(() => {
  if (!isFromEntry() || !shellRef.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  const nav = shellRef.value.querySelector('.nav')
  if (!nav) return

  gsap.fromTo(
    nav,
    { y: -12, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.08 },
  )
})
</script>

<template>
  <div ref="shellRef" class="shell">
    <NavBar />
    <main class="main">
      <slot>
        <RouterView />
      </slot>
    </main>
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  min-height: 100dvh;
}

.main {
  position: relative;
  z-index: 1;
  padding-top: var(--nav-height);
  min-height: 100dvh;
}
</style>
