<script setup lang="ts">
import { ref } from 'vue'
import { useDandelionScene } from '@/composables/useDandelionScene'

const canvasRef = ref<HTMLCanvasElement | null>(null)
useDandelionScene(canvasRef)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas"
    aria-hidden="true"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
