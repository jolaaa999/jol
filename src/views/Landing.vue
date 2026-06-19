<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDandelionThreeScene } from '@/composables/useDandelionThreeScene'
import PoemUnlock from '@/components/PoemUnlock.vue'

/** 蒲公英 Three.js 画布引用 */
const dandelionCanvasRef = ref<HTMLCanvasElement | null>(null)
/** Vue Router 实例 */
const router = useRouter()
/** 是否显示诗文解锁界面 */
const showUnlock = ref(false)

/** 蒲公英场景阶段、淡出透明度及指针交互回调 */
const { phase, fadeOpacity, onPointerMove, onPointerLeave } = useDandelionThreeScene(dandelionCanvasRef, {
  spreadDuration: 2800,
  /** 蒲公英飘散动画结束后显示诗文解锁界面 */
  onTransitionComplete: () => {
    showUnlock.value = true
  },
})

/** 诗文解锁完成后跳转至博客页 */
function onUnlockComplete(): void {
  router.push('/blog')
}

/** 空闲阶段且未解锁时显示操作提示 */
const showHint = computed(() => phase.value === 'idle' && !showUnlock.value)
/** 蒲公英飘散过渡层的叠加不透明度 */
const overlayOpacity = computed(() =>
  phase.value === 'spreading' && !showUnlock.value ? 1 - fadeOpacity.value : 0,
)
</script>

<template>
  <div class="landing">
    <canvas
      ref="dandelionCanvasRef"
      class="layer layer-dandelion"
      aria-label="交互式蒲公英，鼠标划过会吹散"
      @pointermove="onPointerMove"
      @pointerleave="onPointerLeave"
    />

    <div
      class="transition-overlay"
      :style="{ opacity: overlayOpacity }"
      aria-hidden="true"
    />

    <Transition name="hint">
      <p v-if="showHint" class="hint industrial-label">
        鼠标划过 · 吹散蒲公英
      </p>
    </Transition>

    <PoemUnlock v-if="showUnlock" @complete="onUnlockComplete" />
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
    radial-gradient(circle at 15% 12%, rgba(255, 248, 210, 0.95), transparent 38%),
    radial-gradient(circle at 88% 18%, rgba(255, 235, 170, 0.85), transparent 34%),
    radial-gradient(circle at 50% 100%, rgba(210, 175, 95, 0.55), transparent 42%),
    linear-gradient(168deg, #fff8e6 0%, #f5e6b8 38%, #e8d49a 68%, #dcc888 100%);
}

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.layer-dandelion {
  z-index: 10;
  pointer-events: auto;
}

.transition-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 252, 235, 0.5), transparent 28%),
    linear-gradient(168deg, rgba(255, 248, 220, 0.35), rgba(232, 210, 150, 0.12));
  pointer-events: none;
  transition: opacity 0.05s linear;
}

.hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
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
