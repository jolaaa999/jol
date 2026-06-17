<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDandelionPhysics } from '@/composables/useDandelionPhysics'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const router = useRouter()

const { phase, fadeOpacity, onClick } = useDandelionPhysics(canvasRef, {
  blowDuration: 1500,
  fadeDuration: 600,
  onTransitionComplete: () => router.push('/blog'),
})

const showHint = computed(() => phase.value === 'idle')
const overlayOpacity = computed(() =>
  phase.value === 'fading' ? 1 - fadeOpacity.value : 0,
)
</script>

<template>
  <div class="landing">
    <!-- 天空 -->
    <div class="sky" aria-hidden="true">
      <div class="cloud cloud-a" />
      <div class="cloud cloud-b" />
      <div class="cloud cloud-c" />
    </div>

    <!-- 草原 -->
    <div class="meadow" aria-hidden="true">
      <svg
        class="grass-svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a4d2e" stop-opacity="0" />
            <stop offset="30%" stop-color="#1a4d2e" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#0d2818" />
          </linearGradient>
        </defs>
        <path
          fill="url(#grassGrad)"
          d="M0,160 C240,80 480,200 720,120 C960,40 1200,180 1440,100 L1440,320 L0,320 Z"
        />
        <path
          fill="#0d2818"
          opacity="0.85"
          d="M0,220 C360,180 540,260 720,200 C900,140 1080,240 1440,190 L1440,320 L0,320 Z"
        />
        <path
          fill="none"
          stroke="rgba(45, 90, 39, 0.35)"
          stroke-width="1.5"
          d="M0,250 Q360,210 720,240 T1440,230"
        />
      </svg>
    </div>

    <!-- 蒲公英 Canvas -->
    <canvas
      ref="canvasRef"
      class="dandelion-canvas"
      aria-label="交互式蒲公英，点击吹散"
      @click="onClick"
    />

    <!-- 路由过渡遮罩 -->
    <div
      class="transition-overlay"
      :style="{ opacity: overlayOpacity }"
      aria-hidden="true"
    />

    <!-- 引导文案 -->
    <Transition name="hint">
      <p v-if="showHint" class="hint industrial-label">
        点击屏幕 · 吹散蒲公英
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
}

/* ── 天空渐变 ── */
.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    #4a90c2 0%,
    #7eb8d8 28%,
    #b8d9ec 55%,
    #dceef8 78%,
    #edf4f8 100%
  );
}

.cloud {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  filter: blur(1px);
}

.cloud-a {
  top: 12%;
  left: 15%;
  width: 180px;
  height: 60px;
  box-shadow:
    60px 10px 0 20px rgba(255, 255, 255, 0.45),
    120px 5px 0 10px rgba(255, 255, 255, 0.35);
}

.cloud-b {
  top: 8%;
  right: 20%;
  width: 140px;
  height: 50px;
  box-shadow:
    50px 8px 0 16px rgba(255, 255, 255, 0.4),
    100px 3px 0 8px rgba(255, 255, 255, 0.3);
}

.cloud-c {
  top: 22%;
  left: 55%;
  width: 100px;
  height: 40px;
  opacity: 0.7;
  box-shadow: 40px 6px 0 12px rgba(255, 255, 255, 0.35);
}

/* ── 草原 ── */
.meadow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 42%;
  pointer-events: none;
}

.grass-svg {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 100%;
}

/* ── Canvas ── */
.dandelion-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
}

/* ── 过渡遮罩 ── */
.transition-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: var(--color-bg);
  pointer-events: none;
  transition: opacity 0.05s linear;
}

/* ── 引导 ── */
.hint {
  position: absolute;
  bottom: 2.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
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
