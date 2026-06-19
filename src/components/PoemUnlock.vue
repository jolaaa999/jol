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

/** 解锁完成时向父组件派发 complete 事件 */
const emit = defineEmits<{
  complete: []
}>()

/** Three.js 诗文场景画布引用 */
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 诗文布局数据（含空缺位） */
const layoutRef = shallowRef<PoemLayout | null>(null)
/** 已加载的中文字体实例 */
const fontRef = shallowRef<Font | null>(null)
/** 场景初始化是否失败 */
const loadError = ref(false)
/** 字体与布局是否仍在加载 */
const loading = ref(true)

/** 诗文交互场景的阶段、填空进度及生命周期方法 */
const { phase, filledCount, totalBlanks, init, dispose, rebuildScene } =
  usePoemScene(canvasRef, layoutRef, fontRef, {
    dissolveDuration: 2000,
    /** 全部空缺填完后通知父组件 */
    onComplete: () => emit('complete'),
  })

/** 加载字体与布局并初始化 Three.js 诗文解锁场景 */
async function bootstrap(): Promise<void> {
  loading.value = true
  loadError.value = false

  try {
    /** 构建带空缺位的诗文布局 */
    const layout = buildPoemLayoutWithBlanks(UNLOCK_POEM, UNLOCK_BLANK_CHARS)
    /** 加载布局所需的全部中文字形 */
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

/** 组件卸载时释放 Three.js 场景资源 */
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
