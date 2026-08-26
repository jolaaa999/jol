<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGsapNav, type NavSegment } from '@/composables/useGsapNav'

const navRef = ref<HTMLElement | null>(null)
const indicatorRef = ref<HTMLElement | null>(null)

const segments: NavSegment[] = [
  { id: 'home', label: '首页', href: '/blog' },
  { id: 'reflections', label: '有感', href: '/blog#reflections' },
]

const { animateIndicator, hoverSegment } = useGsapNav(navRef, segments)
const router = useRouter()
const route = useRoute()

function isSegmentActive(seg: NavSegment): boolean {
  const hashIdx = seg.href.indexOf('#')
  if (hashIdx !== -1) {
    const path = seg.href.slice(0, hashIdx)
    const hash = seg.href.slice(hashIdx)
    return route.path === path && route.hash === hash
  }
  return route.path === seg.href && !route.hash
}

function syncIndicator(): void {
  const index = segments.findIndex(isSegmentActive)
  if (index >= 0 && indicatorRef.value) {
    animateIndicator(indicatorRef.value, index)
  }
}

function onSegmentClick(index: number, href: string): void {
  if (indicatorRef.value) animateIndicator(indicatorRef.value, index)

  const hashIdx = href.indexOf('#')
  if (hashIdx === -1) {
    if (route.path !== href) router.push(href)
    return
  }

  const path = href.slice(0, hashIdx)
  const hash = href.slice(hashIdx)
  router.push({ path, hash })
}

onMounted(() => {
  nextTick(syncIndicator)
})

watch(() => route.fullPath, () => {
  nextTick(syncIndicator)
})
</script>

<template>
  <header ref="navRef" class="nav">
    <div class="nav-inner">
      <div data-nav-brand class="nav-brand">
        <span class="nav-brand-text">jol</span>
        <span class="nav-brand-dot" />
      </div>

      <nav class="nav-segments" aria-label="主导航">
        <div
          ref="indicatorRef"
          data-nav-indicator
          class="nav-indicator"
        />
        <button
          v-for="(seg, i) in segments"
          :key="seg.id"
          data-nav-segment
          type="button"
          class="nav-segment"
          :class="{ 'is-active': isSegmentActive(seg) }"
          @click="onSegmentClick(i, seg.href)"
          @mouseenter="hoverSegment($event.currentTarget as HTMLElement, true)"
          @mouseleave="hoverSegment($event.currentTarget as HTMLElement, false)"
        >
          <span class="segment-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="segment-label">{{ seg.label }}</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--nav-height);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 2.75rem);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.nav-brand-text {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  color: rgba(255, 255, 255, 0.92);
}

.nav-brand-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4da6ff;
  box-shadow: 0 0 12px rgba(77, 166, 255, 0.8);
}

.nav-segments {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-indicator {
  position: absolute;
  bottom: 0.35rem;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, #9ed8ff, #c084fc);
  transform-origin: left center;
  pointer-events: none;
}

.nav-segment {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  transition: color 0.35s var(--ease-mechanical);
}

.nav-segment:hover,
.nav-segment.is-active {
  color: rgba(255, 255, 255, 0.92);
}

.segment-index {
  color: rgba(255, 255, 255, 0.28);
  font-size: 0.625rem;
}

.nav-segment.is-active .segment-index {
  color: #9ed8ff;
}
</style>
