<script setup lang="ts">
import { ref, provide } from 'vue'
import { useFluidGradient } from '@/composables/useFluidGradient'
import { FLUID_CYCLE_KEY } from '@/composables/fluidGradientContext'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { cyclePalette } = useFluidGradient(canvasRef)

provide(FLUID_CYCLE_KEY, cyclePalette)
</script>

<template>
  <div class="fluid-backdrop" aria-hidden="true">
    <canvas ref="canvasRef" class="fluid-backdrop__canvas" />
    <div class="fluid-backdrop__grain" />
  </div>
</template>

<style scoped>
.fluid-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.fluid-backdrop__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.fluid-backdrop__grain {
  position: absolute;
  inset: 0;
  opacity: var(--fluid-grain-opacity, 0.035);
  transition: opacity 0.45s var(--ease-mechanical);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
</style>
