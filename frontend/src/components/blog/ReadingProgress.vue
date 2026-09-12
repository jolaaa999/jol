<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)

function onScroll(): void {
  const scrollTop = window.scrollY
  const docHeight = document.documentElement.scrollHeight - window.innerHeight
  progress.value = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="reading-progress" aria-hidden="true">
    <div class="reading-progress__bar" :style="{ width: `${progress}%` }" />
  </div>
</template>

<style scoped>
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 200;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
}

.reading-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, #9ed8ff, #c084fc);
  transition: width 0.12s linear;
}
</style>
