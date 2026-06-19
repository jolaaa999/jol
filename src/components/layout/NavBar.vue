<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGsapNav, type NavSegment } from '@/composables/useGsapNav'

/** 导航栏根元素引用 */
const navRef = ref<HTMLElement | null>(null)
/** 底部活动指示条元素引用 */
const indicatorRef = ref<HTMLElement | null>(null)

/** 主导航分段配置 */
const segments: NavSegment[] = [
  { id: 'home', label: '首页', href: '/blog' },
  { id: 'posts', label: '文章', href: '/posts' },
  { id: 'about', label: '关于', href: '/about' },
]

/** GSAP 导航指示条动画与悬停交互 */
const { animateIndicator, hoverSegment } = useGsapNav(navRef, segments)
/** Vue Router 实例 */
const router = useRouter()
/** 当前路由信息 */
const route = useRoute()

/** 点击导航分段：驱动指示条动画并路由跳转 */
function onSegmentClick(index: number, href: string): void {
  if (indicatorRef.value) animateIndicator(indicatorRef.value, index)
  if (route.path !== href) router.push(href)
}
</script>

<template>
  <header ref="navRef" class="nav glass-panel">
    <div class="nav-inner">
      <div data-nav-brand class="nav-brand">
        <span class="brand-mark" />
        <span class="brand-text">JOL</span>
        <span class="industrial-label brand-sub">personal blog</span>
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
          :class="{ 'is-active': route.path === seg.href }"
          @click="onSegmentClick(i, seg.href)"
          @mouseenter="hoverSegment($event.currentTarget as HTMLElement, true)"
          @mouseleave="hoverSegment($event.currentTarget as HTMLElement, false)"
        >
          <span class="segment-index">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="segment-label">{{ seg.label }}</span>
        </button>
      </nav>
    </div>
    <div class="accent-line" />
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
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.brand-mark {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  transform: rotate(45deg);
}

.brand-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  color: var(--color-foreground);
}

.brand-sub {
  margin-left: 0.5rem;
  opacity: 0.6;
}

.nav-segments {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-indicator {
  position: absolute;
  bottom: -1px;
  left: 0;
  height: 2px;
  background: var(--color-accent);
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
  color: var(--color-foreground-dim);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  transition: color 0.35s var(--ease-mechanical);
}

.nav-segment:hover,
.nav-segment.is-active {
  color: var(--color-foreground);
}

.segment-index {
  color: var(--color-muted);
  font-size: 0.625rem;
}

.nav-segment.is-active .segment-index {
  color: var(--color-accent-cyan);
}
</style>
