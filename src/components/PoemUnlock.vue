<script setup lang="ts">
import { ref, shallowRef, onUnmounted } from 'vue'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { usePoemScene } from '@/composables/usePoemScene'
import { preloadUnlockAssets } from '@/utils/unlockPreload'
import type { PoemLayout } from '@/types/poem'

/** 是否已显示（亮光消退后淡入） */
defineProps<{
  revealed?: boolean
}>()

/** 场景就绪与解锁完成事件 */
const emit = defineEmits<{
  ready: []
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

/** 诗文交互场景的阶段、填空进度及生命周期方法 */
const { phase, filledCount, totalBlanks, init, dispose, rebuildScene } =
  usePoemScene(canvasRef, layoutRef, fontRef, {
    dissolveDuration: 4800,
    /** 全部空缺填完后通知父组件 */
    onComplete: () => emit('complete'),
  })

/** 后台加载字体与布局并初始化 Three.js 诗文解锁场景（无 loading 遮罩） */
async function bootstrap(): Promise<void> {
  loadError.value = false

  try {
    const { font, layout } = await preloadUnlockAssets()
    fontRef.value = font
    layoutRef.value = layout

    init()
    rebuildScene()
    emit('ready')
  } catch (err) {
    console.error('[PoemUnlock] bootstrap failed:', err)
    loadError.value = true
  }
}

bootstrap()

/** 组件卸载时释放 Three.js 场景资源 */
onUnmounted(dispose)
</script>

<template>
  <div class="poem-unlock" :class="{ 'is-revealed': revealed }">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="诗文解锁场景" />

    <div v-if="loadError && revealed" class="overlay-state">
      <span class="industrial-label">scene init failed</span>
    </div>

    <div v-else-if="phase === 'playing' && revealed" class="hud">
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
  z-index: 50;
  opacity: 0;
  pointer-events: none;
  background: transparent;
  transition: opacity 1.1s cubic-bezier(0.22, 1, 0.36, 1);
}

.poem-unlock.is-revealed {
  opacity: 1;
  pointer-events: auto;
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
