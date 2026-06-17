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
    radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.08), transparent 28%),
    radial-gradient(circle at 50% 68%, rgba(255, 214, 160, 0.04), transparent 35%),
    #071018;
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
  background: #071018;
  pointer-events: none;
  transition: opacity 0.05s linear;
}

.hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  color: rgba(255, 255, 255, 0.72);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
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
