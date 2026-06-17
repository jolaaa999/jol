<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'

export interface MechanicalNavNode {
  id: string
  label: string
  to: string
}

const emit = defineEmits<{
  navigate: [to: string]
}>()

const NODES: MechanicalNavNode[] = [
  { id: 'home', label: '首页', to: '/blog' },
  { id: 'poetry', label: '诗文', to: '/blog#poetry' },
  { id: 'reflections', label: '有感', to: '/blog#reflections' },
]

/** 顺时针扇形展开角度（度，0 = 右，-90 = 上） */
const FAN_ANGLES = [-90, -45, 0] as const
const FAN_RADIUS = 92
const MECHANICAL_EASE = 'back.out(1.65)'
const HUB_ROTATION = 108

const isExpanded = ref(false)
const isAnimating = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const hubRef = ref<HTMLElement | null>(null)
const nodeEls = ref<(HTMLElement | null)[]>([])

let gsapCtx: gsap.Context | null = null
let activeTimeline: gsap.core.Timeline | null = null

function setNodeEl(el: unknown, index: number): void {
  if (el instanceof HTMLElement) {
    nodeEls.value[index] = el
  }
}

function polarToXY(deg: number, radius: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return {
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
  }
}

/** 咔哒锁定 — 极短促透明度闪烁 + scale 微震 */
function playLockSnap(el: HTMLElement): void {
  gsap
    .timeline()
    .to(el, { opacity: 0.55, scale: 1.1, duration: 0.045, ease: 'power2.in' })
    .to(el, { opacity: 1, scale: 0.94, duration: 0.07, ease: 'power3.out' })
    .to(el, { scale: 1, duration: 0.14, ease: 'elastic.out(1, 0.55)' })
}

function initCollapsed(): void {
  if (!hubRef.value) return
  gsap.set(hubRef.value, { rotation: 0, transformOrigin: '50% 50%' })
  nodeEls.value.forEach((el) => {
    if (!el) return
    gsap.set(el, {
      x: 0,
      y: 0,
      opacity: 0,
      scale: 0,
      pointerEvents: 'none',
      transformOrigin: '50% 50%',
    })
  })
}

function expand(): void {
  if (isAnimating.value || isExpanded.value) return
  isAnimating.value = true

  activeTimeline?.kill()
  activeTimeline = gsap.timeline({
    onComplete: () => {
      isExpanded.value = true
      isAnimating.value = false
    },
  })

  activeTimeline.to(hubRef.value, {
    rotation: HUB_ROTATION,
    duration: 0.62,
    ease: MECHANICAL_EASE,
  })

  nodeEls.value.forEach((el, i) => {
    if (!el) return
    const { x, y } = polarToXY(FAN_ANGLES[i], FAN_RADIUS)

    activeTimeline!.to(
      el,
      {
        x,
        y,
        opacity: 1,
        scale: 1,
        duration: 0.52,
        ease: MECHANICAL_EASE,
        pointerEvents: 'auto',
        onComplete: () => playLockSnap(el),
      },
      i * 0.09 + 0.06,
    )
  })
}

function collapse(): void {
  if (isAnimating.value || !isExpanded.value) return
  isAnimating.value = true

  activeTimeline?.kill()
  activeTimeline = gsap.timeline({
    onComplete: () => {
      isExpanded.value = false
      isAnimating.value = false
      initCollapsed()
    },
  })

  const reversed = [...nodeEls.value].reverse()
  reversed.forEach((el, i) => {
    if (!el) return
    activeTimeline!.to(
      el,
      {
        x: 0,
        y: 0,
        opacity: 0,
        scale: 0,
        duration: 0.32,
        ease: 'power3.in',
        pointerEvents: 'none',
      },
      i * 0.05,
    )
  })

  activeTimeline.to(
    hubRef.value,
    {
      rotation: 0,
      duration: 0.48,
      ease: 'power3.inOut',
    },
    0.08,
  )
}

function toggleHub(): void {
  if (isExpanded.value) {
    collapse()
  } else {
    expand()
  }
}

function onNodeClick(node: MechanicalNavNode): void {
  if (isAnimating.value) return
  emit('navigate', node.to)
  collapse()
}

function onDocumentPointerDown(e: PointerEvent): void {
  if (!isExpanded.value || !containerRef.value) return
  const target = e.target as Node
  if (!containerRef.value.contains(target)) {
    collapse()
  }
}

onMounted(() => {
  gsapCtx = gsap.context(() => {
    initCollapsed()
  }, containerRef.value ?? undefined)

  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onUnmounted(() => {
  activeTimeline?.kill()
  gsapCtx?.revert()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})

defineExpose({ isExpanded, expand, collapse, toggle: toggleHub })
</script>

<template>
  <nav
    ref="containerRef"
    class="mechanical-nav"
    aria-label="机械导航"
  >
    <!-- 子节点轨道 -->
    <div class="nav-orbit" :class="{ 'is-expanded': isExpanded }">
      <button
        v-for="(node, i) in NODES"
        :key="node.id"
        :ref="(el) => setNodeEl(el, i)"
        type="button"
        class="nav-node"
        :aria-label="node.label"
        :tabindex="isExpanded ? 0 : -1"
        @click="onNodeClick(node)"
      >
        <span class="node-ring" aria-hidden="true" />
        <span class="node-label">{{ node.label }}</span>
      </button>
    </div>

    <!-- 轴心圆球 -->
    <button
      ref="hubRef"
      type="button"
      class="nav-hub"
      :aria-expanded="isExpanded"
      aria-label="展开导航"
      @click="toggleHub"
    >
      <svg
        class="hub-gear"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="gearGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.08)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.15)" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="8" fill="url(#gearGrad)" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />
        <g fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="0.75">
          <path d="M24 6 L24 10 M24 38 L24 42 M6 24 L10 24 M38 24 L42 24" />
          <path d="M11.5 11.5 L14.5 14.5 M33.5 33.5 L36.5 36.5 M11.5 36.5 L14.5 33.5 M33.5 14.5 L36.5 11.5" />
          <circle cx="24" cy="24" r="14" stroke-dasharray="2 3" opacity="0.6" />
          <circle cx="24" cy="24" r="18" stroke-dasharray="1 4" opacity="0.35" />
        </g>
        <g fill="rgba(255,255,255,0.04)">
          <rect x="22" y="4" width="4" height="6" rx="0.5" />
          <rect x="22" y="38" width="4" height="6" rx="0.5" />
          <rect x="4" y="22" width="6" height="4" rx="0.5" />
          <rect x="38" y="22" width="6" height="4" rx="0.5" />
        </g>
      </svg>
      <span class="hub-highlight" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped>
.mechanical-nav {
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  z-index: 200;
  width: 3.5rem;
  height: 3.5rem;
}

.nav-orbit {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.nav-orbit.is-expanded {
  pointer-events: auto;
}

/* ── 轴心圆球：拉丝金属 + 拟态玻璃 ── */
.nav-hub {
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.18) 0%,
      rgba(255, 255, 255, 0.04) 28%,
      transparent 50%
    ),
    linear-gradient(
      315deg,
      #48484f 0%,
      #2a2a30 35%,
      #16161a 65%,
      #323238 100%
    );
  backdrop-filter: blur(10px) saturate(130%);
  -webkit-backdrop-filter: blur(10px) saturate(130%);
  box-shadow:
    inset 0 2px 3px rgba(255, 255, 255, 0.2),
    inset 0 -3px 6px rgba(0, 0, 0, 0.45),
    0 6px 20px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.35s var(--ease-mechanical);
}

.nav-hub:hover {
  box-shadow:
    inset 0 2px 4px rgba(255, 255, 255, 0.25),
    inset 0 -3px 6px rgba(0, 0, 0, 0.4),
    0 8px 28px rgba(0, 0, 0, 0.6),
    0 0 16px rgba(255, 107, 44, 0.08);
}

.nav-hub:active {
  box-shadow:
    inset 0 3px 8px rgba(0, 0, 0, 0.5),
    inset 0 -1px 2px rgba(255, 255, 255, 0.1),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.hub-gear {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0.625rem;
  opacity: 0.85;
  pointer-events: none;
}

.hub-highlight {
  position: absolute;
  top: 8%;
  left: 15%;
  width: 45%;
  height: 30%;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 255, 255, 0.22) 0%,
    transparent 70%
  );
  pointer-events: none;
}

/* ── 子节点 ── */
.nav-node {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin: -1.5rem 0 0 -1.5rem;
  padding: 0;
  border: 1px solid var(--glass-endfield-border);
  border-radius: 50%;
  cursor: pointer;
  background: var(--glass-endfield-bg);
  backdrop-filter: blur(var(--glass-endfield-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-endfield-blur)) saturate(150%);
  box-shadow: var(--glass-endfield-shadow);
  will-change: transform, opacity;
}

.nav-node:hover {
  border-color: rgba(0, 212, 170, 0.35);
  box-shadow:
    var(--glass-endfield-shadow),
    0 0 12px rgba(0, 212, 170, 0.12);
}

.nav-node:hover .node-label {
  color: var(--color-accent-cyan);
}

.node-ring {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.node-label {
  position: relative;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--color-foreground);
  white-space: nowrap;
  transition: color 0.25s var(--ease-mechanical);
}

@media (max-width: 480px) {
  .mechanical-nav {
    bottom: 1.25rem;
    left: 1.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-hub,
  .nav-node {
    transition: none;
  }
}
</style>
