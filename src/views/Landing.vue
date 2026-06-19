<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDandelionThreeScene } from '@/composables/useDandelionThreeScene'
import { preloadUnlockAssets } from '@/utils/unlockPreload'
import PoemUnlock from '@/components/PoemUnlock.vue'

/** 蒲公英 Three.js 画布引用 */
const dandelionCanvasRef = ref<HTMLCanvasElement | null>(null)
/** Vue Router 实例 */
const router = useRouter()
/** 解锁页是否已显示 */
const unlockRevealed = ref(false)
/** 解锁场景是否已就绪 */
const unlockReady = ref(false)
/** 亮光消退层不透明度 [0, 1] */
const lightFade = ref(0)
/** 蒲公英层是否仍可见 */
const dandelionVisible = ref(true)

/** 蒲公英场景阶段、飘散进度、白光强度及指针交互 */
const { phase, lightIntensity, onPointerMove, onPointerLeave } = useDandelionThreeScene(
  dandelionCanvasRef,
  {
    spreadDuration: 3200,
    /** 飘散结束 → 等待解锁就绪后从亮光中显现 */
    onTransitionComplete: () => {
      void revealUnlockFromLight()
    },
  },
)

/** 页面挂载时预加载解锁资源，避免过渡黑屏 */
onMounted(() => {
  preloadUnlockAssets().catch(() => {
    /* PoemUnlock 会处理失败态 */
  })
})

/** 等待解锁场景就绪（最长 8s） */
function waitForUnlockReady(timeoutMs = 8000): Promise<void> {
  if (unlockReady.value) return Promise.resolve()
  return new Promise((resolve) => {
    const start = performance.now()
    const tick = (): void => {
      if (unlockReady.value || performance.now() - start >= timeoutMs) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** 白光峰值后淡出，解锁页从亮光中显现 */
async function revealUnlockFromLight(): Promise<void> {
  await waitForUnlockReady()
  lightFade.value = 1
  unlockRevealed.value = true

  await new Promise((r) => setTimeout(r, 120))

  const start = performance.now()
  const duration = 1400

  await new Promise<void>((resolve) => {
    const fade = (now: number): void => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      lightFade.value = 1 - eased
      if (t < 1) {
        requestAnimationFrame(fade)
      } else {
        dandelionVisible.value = false
        resolve()
      }
    }
    requestAnimationFrame(fade)
  })
}

/** 诗文解锁完成后跳转至入口主页 */
function onUnlockComplete(): void {
  router.push('/entry')
}

/** 空闲阶段且未解锁时显示操作提示 */
const showHint = computed(() => phase.value === 'idle' && !unlockRevealed.value)

/** 全屏亮光层：飘散末段渐亮 + 解锁时消退 */
const lightWashOpacity = computed(() => {
  if (unlockRevealed.value) return lightFade.value
  return lightIntensity.value
})
</script>

<template>
  <div class="landing">
    <PoemUnlock
      :revealed="unlockRevealed"
      @ready="unlockReady = true"
      @complete="onUnlockComplete"
    />

    <canvas
      v-show="dandelionVisible"
      ref="dandelionCanvasRef"
      class="layer layer-dandelion"
      aria-label="交互式蒲公英，鼠标划过会吹散"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    />

    <div
      class="light-wash"
      :style="{ opacity: lightWashOpacity }"
      aria-hidden="true"
    />

    <Transition name="hint">
      <p v-if="showHint" class="hint industrial-label">
        鼠标划过 · 吹散蒲公英
      </p>
    </Transition>
  </div>
</template>

<style scoped>
.landing {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  background:
    radial-gradient(circle at 15% 12%, rgba(240, 225, 180, 0.35), transparent 32%),
    radial-gradient(circle at 88% 18%, rgba(235, 215, 165, 0.28), transparent 28%),
    radial-gradient(circle at 50% 100%, rgba(200, 170, 110, 0.22), transparent 36%),
    linear-gradient(168deg, #ede0c4 0%, #e0d0a8 38%, #d4c490 68%, #c8b878 100%);
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.layer-dandelion {
  z-index: 60;
  pointer-events: auto;
}

.light-wash {
  position: absolute;
  inset: 0;
  z-index: 70;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 48%, rgba(255, 252, 238, 0.98) 0%, rgba(255, 245, 215, 0.88) 38%, rgba(255, 235, 190, 0.55) 62%, rgba(255, 220, 160, 0.18) 100%);
  transition: opacity 0.04s linear;
  will-change: opacity;
}

.hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 65;
  color: rgba(88, 72, 42, 0.72);
  text-shadow: 0 1px 8px rgba(255, 252, 235, 0.65);
  letter-spacing: 0.18em;
  pointer-events: none;
}

.hint-enter-active,
.hint-leave-active {
  transition:
    opacity 0.5s var(--ease-mechanical),
    transform 0.5s var(--ease-mechanical);
}

.hint-enter-from,
.hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
