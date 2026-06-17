<script setup lang="ts">
import NavBar from './NavBar.vue'
import ParticleCanvas from '@/components/canvas/ParticleCanvas.vue'
</script>

<template>
  <div class="shell">
    <ParticleCanvas />
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
