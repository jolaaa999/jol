<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGsapNav, type NavSegment } from '@/composables/useGsapNav'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import { useCommandPalette } from '@/composables/useCommandPalette'

const navRef = ref<HTMLElement | null>(null)
const indicatorRef = ref<HTMLElement | null>(null)

const segments: NavSegment[] = [
  { id: 'home', label: '首页', href: '/blog' },
  { id: 'reflections', label: '有感', href: '/blog#reflections' },
  { id: 'about', label: '关于', href: '/entry#about' },
]

const { animateIndicator, hoverSegment } = useGsapNav(navRef, segments)
const router = useRouter()
const route = useRoute()
const { show: showCommandPalette } = useCommandPalette()

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
      <RouterLink to="/entry" class="nav-brand" data-nav-brand>
        <span class="nav-brand-text">jol</span>
        <span class="nav-brand-dot" />
      </RouterLink>

      <nav class="nav-segments" aria-label="主导航">
        <div ref="indicatorRef" data-nav-indicator class="nav-indicator" />
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

      <div class="nav-actions">
        <button type="button" class="nav-search" aria-label="搜索 (Ctrl+K)" @click="showCommandPalette">
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <ThemeToggle />
      </div>
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
  gap: 1rem;
  height: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 2.75rem);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  text-decoration: none;
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

.nav-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-search {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.55);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}

.nav-search kbd {
  padding: 0.1rem 0.3rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.55rem;
}

@media (max-width: 720px) {
  .nav-search span:first-child {
    display: none;
  }
}
</style>
