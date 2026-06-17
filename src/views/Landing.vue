<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAtmosphereRenderer } from '@/composables/useAtmosphereRenderer'
import { useGrassRenderer } from '@/composables/useGrassRenderer'
import { useDandelionPhysics } from '@/composables/useDandelionPhysics'
import PoemUnlock from '@/components/PoemUnlock.vue'

const skyCanvasRef = ref<HTMLCanvasElement | null>(null)
const grassCanvasRef = ref<HTMLCanvasElement | null>(null)
const dandelionCanvasRef = ref<HTMLCanvasElement | null>(null)
const router = useRouter()
const showUnlock = ref(false)

useAtmosphereRenderer(skyCanvasRef)

const { phase, fadeOpacity, focusPoint, onClick } = useDandelionPhysics(dandelionCanvasRef, {
  blowDuration: 1500,
  fadeDuration: 600,
  onTransitionComplete: () => {
    showUnlock.value = true
  },
})

useGrassRenderer(grassCanvasRef, focusPoint)

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
    <canvas ref="skyCanvasRef" class="layer layer-sky" aria-hidden="true" />
    <canvas ref="grassCanvasRef" class="layer layer-grass" aria-hidden="true" />
    <canvas
      ref="dandelionCanvasRef"
      class="layer layer-dandelion"
      aria-label="交互式蒲公英，点击吹散"
      @click="onClick"
    />

    <div
      class="transition-overlay"
      :style="{ opacity: overlayOpacity }"
      aria-hidden="true"
    />

    <Transition name="hint">
      <p v-if="showHint" class="hint industrial-label">
        点击屏幕 · 吹散蒲公英
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
  background: #0a1628;
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

.layer-grass {
  z-index: 5;
}

.layer-sky {
  z-index: 0;
}

.transition-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: var(--color-bg);
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
