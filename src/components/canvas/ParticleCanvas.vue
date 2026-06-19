<script setup lang="ts">
import { ref } from 'vue'
import { useDandelionScene } from '@/composables/useDandelionScene'

/** 背景蒲公英粒子画布引用 */
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 挂载 2D 蒲公英粒子背景场景 */
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
