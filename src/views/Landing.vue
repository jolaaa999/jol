<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDandelionPhysics } from '@/composables/useDandelionPhysics'
import PoemUnlock from '@/components/PoemUnlock.vue'

const dandelionCanvasRef = ref<HTMLCanvasElement | null>(null)
const router = useRouter()
const showUnlock = ref(false)

const { phase, fadeOpacity, onPointerMove, onPointerLeave } = useDandelionPhysics(dandelionCanvasRef, {
  blowDuration: 1500,
  fadeDuration: 600,
  onTransitionComplete: () => {
    showUnlock.value = true
  },
})

function onUnlockComplete(): void {
  router.push('/blog')
}

const showHint = computed(() => phase.value === 'idle' && !showUnlock.value)
const overlayOpacity = computed(() =>
  phase.value === 'fading' && !showUnlock.value ? 1 - fadeOpacity.value : 0,
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
    radial-gradient(circle at 18% 18%, rgba(255, 210, 240, 0.9), transparent 34%),
    radial-gradient(circle at 82% 22%, rgba(180, 225, 255, 0.88), transparent 36%),
    radial-gradient(circle at 50% 78%, rgba(255, 235, 248, 0.92), transparent 30%),
    linear-gradient(145deg, #f7d7f2 0%, #d8ecff 48%, #c9ddff 100%);
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
    radial-gradient(circle at 22% 28%, rgba(255, 255, 255, 0.45), transparent 26%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.08));
  pointer-events: none;
  transition: opacity 0.05s linear;
}

.hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  color: rgba(98, 92, 130, 0.78);
  text-shadow: 0 1px 6px rgba(255, 255, 255, 0.55);
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
