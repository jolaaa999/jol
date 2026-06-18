<script setup lang="ts">
import { ref, shallowRef, onUnmounted } from 'vue'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { usePoemScene } from '@/composables/usePoemScene'
import { loadChineseFont } from '@/utils/chineseFontLoader'
import {
  UNLOCK_POEM,
  UNLOCK_BLANK_CHARS,
  buildPoemLayoutWithBlanks,
  collectAllFontChars,
} from '@/utils/poemLayout'
import type { PoemLayout } from '@/types/poem'

const emit = defineEmits<{
  complete: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const layoutRef = shallowRef<PoemLayout | null>(null)
const fontRef = shallowRef<Font | null>(null)
const loadError = ref(false)
const loading = ref(true)

const { phase, filledCount, totalBlanks, init, dispose, rebuildScene } =
  usePoemScene(canvasRef, layoutRef, fontRef, {
    dissolveDuration: 2000,
    onComplete: () => emit('complete'),
  })

async function bootstrap(): Promise<void> {
  loading.value = true
  loadError.value = false

  try {
    const layout = buildPoemLayoutWithBlanks(UNLOCK_POEM, UNLOCK_BLANK_CHARS)
    const font = await loadChineseFont(collectAllFontChars(layout))
    fontRef.value = font
    layoutRef.value = layout
    loading.value = false

    init()
    rebuildScene()
  } catch (err) {
    console.error('[PoemUnlock] bootstrap failed:', err)
    loadError.value = true
    loading.value = false
  }
}

bootstrap()

onUnmounted(dispose)
</script>

<template>
  <div class="poem-unlock">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="诗文解锁场景" />

    <div v-if="loading" class="overlay-state">
      <span class="industrial-label">loading scene</span>
    </div>

    <div v-else-if="loadError" class="overlay-state">
      <span class="industrial-label">scene init failed</span>
    </div>

    <div v-else-if="phase === 'playing'" class="hud">
      <p class="hud-hint industrial-label">
        点击地面文字 · 填入空缺 {{ filledCount }}/{{ totalBlanks }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.poem-unlock {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #050508;
}

.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.overlay-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 8, 0.92);
  pointer-events: none;
}

.hud {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
}

.hud-hint {
  margin: 0;
  color: rgba(180, 175, 165, 0.75);
  letter-spacing: 0.16em;
}
</style>
