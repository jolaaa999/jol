<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEntryPage, type EntryMenuItem } from '@/composables/useEntryPage'
import { useFluidGradient } from '@/composables/useFluidGradient'

/** 页面根元素 */
const rootRef = ref<HTMLElement | null>(null)
/** 流体渐变 canvas */
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** Vue Router */
const router = useRouter()

/** 主标题逐字拆分 */
const HEADLINE = "Hi, I'm JOL"
const headlineChars = HEADLINE.split('')

/** 侧边菜单项 */
const menuItems: EntryMenuItem[] = [
  { id: 'home', label: 'HOME', href: '/blog' },
  { id: 'poetry', label: 'POETRY', href: '/blog#poetry' },
  { id: 'reflections', label: 'REFLECTIONS', href: '/blog#reflections' },
  { id: 'contact', label: 'CONTACT', href: 'mailto:hello@jol.dev' },
]

const { menuOpen, toggleMenu, closeMenu } = useEntryPage(rootRef, menuItems)
const { cyclePalette } = useFluidGradient(canvasRef)

/** 导航至目标路径，支持 hash 锚点 */
function navigateTo(href: string): void {
  closeMenu()

  if (href.startsWith('mailto:')) {
    window.location.href = href
    return
  }

  const hashIdx = href.indexOf('#')
  if (hashIdx === -1) {
    setTimeout(() => router.push(href), 380)
    return
  }

  const path = href.slice(0, hashIdx)
  const hash = href.slice(hashIdx)
  setTimeout(() => {
    router.push({ path, hash }).then(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, 380)
}

/** 主 CTA：进入博客 */
function enterBlog(): void {
  router.push('/blog')
}
</script>

<template>
  <div ref="rootRef" class="entry" :class="{ 'entry--menu-open': menuOpen }">
    <canvas ref="canvasRef" class="entry__canvas" aria-hidden="true" />

    <div class="entry__grain" aria-hidden="true" />

    <header class="entry__header">
      <div class="entry__brand" data-hero-block>
        <span class="entry__brand-text">jol</span>
        <span class="entry__brand-dot" />
      </div>

      <button
        type="button"
        class="entry__menu-trigger"
        data-hero-block
        :aria-expanded="menuOpen"
        aria-controls="entry-menu"
        @click="toggleMenu"
      >
        <span>Menu</span>
        <span class="entry__menu-icon" aria-hidden="true">+</span>
      </button>
    </header>

    <main class="entry__hero">
      <p class="entry__eyebrow" data-hero-block>HELLO, WORLD</p>

      <h1 class="entry__headline" aria-label="Hi, I'm JOL">
        <span
          v-for="(char, i) in headlineChars"
          :key="`${char}-${i}`"
          class="entry__char-wrap"
        >
          <span class="entry__char" data-hero-char>{{ char === ' ' ? '\u00A0' : char }}</span>
        </span>
      </h1>

      <p class="entry__bio" data-hero-block>
        Developer &amp; creator. Building digital experiences that merge
        technical precision with fluid aesthetics.
      </p>

      <div class="entry__actions" data-hero-block>
        <button type="button" class="entry__cta entry__cta--primary" @click="enterBlog">
          <svg class="entry__cta-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 6h16v12H4V6Z"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <path
              d="m4 7 8 6 8-6"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>进入博客</span>
          <span class="entry__cta-arrow" aria-hidden="true">→</span>
        </button>

        <a
          class="entry__cta entry__cta--ghost"
          href="mailto:hello@jol.dev"
        >
          发送邮件联系
        </a>
      </div>
    </main>

    <div
      id="entry-menu"
      class="entry__menu"
      :class="{ 'entry__menu--open': menuOpen }"
      :aria-hidden="!menuOpen"
    >
      <div class="entry__menu-layers" aria-hidden="true">
        <div class="entry__menu-layer entry__menu-layer--1" data-menu-layer />
        <div class="entry__menu-layer entry__menu-layer--2" data-menu-layer />
        <div class="entry__menu-layer entry__menu-layer--3" data-menu-layer />
      </div>

      <aside class="entry__menu-panel" data-menu-panel>
        <button
          type="button"
          class="entry__menu-close"
          @click="closeMenu"
        >
          <span class="entry__menu-close-inner" data-menu-close-inner>
            <span>Close</span>
            <span aria-hidden="true">×</span>
          </span>
        </button>

        <nav class="entry__menu-nav" aria-label="站点导航">
          <a
            v-for="item in menuItems"
            :key="item.id"
            class="entry__menu-link"
            :href="item.href"
            @click.prevent="navigateTo(item.href)"
          >
            <span class="entry__menu-link-inner" data-menu-item-inner>{{ item.label }}</span>
          </a>
        </nav>

        <a
          class="entry__menu-credits"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="entry__menu-credits-inner" data-menu-credits-inner>
            Credits
            <span class="entry__menu-arrow" aria-hidden="true">↗</span>
          </span>
        </a>

        <footer class="entry__menu-footer">
          <span class="entry__menu-footer-label" data-menu-footer-inner>Socials</span>
          <div class="entry__menu-footer-links">
            <button type="button" class="entry__menu-footer-link" data-menu-footer-inner @click="cyclePalette">
              切换背景
            </button>
            <a
              class="entry__menu-footer-link"
              data-menu-footer-inner
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </footer>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.entry {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.92);
}

.entry__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.entry__grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.entry__header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: clamp(1.25rem, 3vw, 2rem) clamp(1.5rem, 4vw, 2.75rem);
}

.entry__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.entry__brand-text {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

.entry__brand-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4da6ff;
  box-shadow: 0 0 12px rgba(77, 166, 255, 0.8);
}

.entry__menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.88);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: opacity 0.25s var(--ease-mechanical);
}

.entry__menu-trigger:hover {
  opacity: 0.72;
}

.entry__menu-icon {
  font-size: 1rem;
  font-weight: 300;
  line-height: 1;
  transition: transform 0.45s var(--ease-damped);
}

.entry--menu-open .entry__menu-icon {
  transform: rotate(45deg);
}

.entry__hero {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - 5rem);
  padding: 2rem clamp(1.5rem, 5vw, 3rem) 4rem;
  text-align: center;
}

.entry__eyebrow {
  margin: 0 0 1.25rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.entry__headline {
  margin: 0 0 1.5rem;
  font-size: clamp(2.75rem, 8vw, 5.5rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: rgba(255, 255, 255, 0.94);
}

.entry__char-wrap {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  line-height: 1.05;
}

.entry__char {
  display: inline-block;
  will-change: transform;
}

.entry__bio {
  max-width: 32rem;
  margin: 0 0 2.25rem;
  font-family: var(--font-mono);
  font-size: clamp(0.8125rem, 1.6vw, 0.9375rem);
  font-weight: 300;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.72);
}

.entry__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.entry__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1.35rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.04em;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.35s var(--ease-mechanical),
    background 0.35s var(--ease-mechanical),
    border-color 0.35s var(--ease-mechanical);
}

.entry__cta--primary {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(8, 8, 16, 0.38);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  color: rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.28);
}

.entry__cta--primary:hover {
  transform: translateY(-2px);
  background: rgba(12, 12, 22, 0.52);
  border-color: rgba(255, 255, 255, 0.22);
}

.entry__cta--ghost {
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.55);
  padding: 0.35rem 0.75rem;
}

.entry__cta--ghost:hover {
  color: rgba(255, 255, 255, 0.82);
}

.entry__cta-icon {
  width: 1rem;
  height: 1rem;
  opacity: 0.85;
}

.entry__cta-arrow {
  opacity: 0.6;
  transition: transform 0.35s var(--ease-mechanical);
}

.entry__cta--primary:hover .entry__cta-arrow {
  transform: translateX(3px);
  opacity: 1;
}

/* ── 多层菜单 ── */
.entry__menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.entry__menu--open {
  pointer-events: auto;
}

.entry__menu-layers {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: flex-end;
}

.entry__menu-layer {
  height: 100%;
  will-change: transform;
}

.entry__menu:not(.entry__menu--open) .entry__menu-layer,
.entry__menu:not(.entry__menu--open) .entry__menu-panel {
  transform: translateX(108%);
}

.entry__menu-layer--1 {
  width: clamp(2.5rem, 5vw, 4rem);
  background: #0a0e1a;
}

.entry__menu-layer--2 {
  width: clamp(3.5rem, 7vw, 5.5rem);
  background: linear-gradient(180deg, #2a18a8 0%, #1a4fd4 100%);
}

.entry__menu-layer--3 {
  width: clamp(1.5rem, 3vw, 2.5rem);
  background: rgba(255, 255, 255, 0.08);
}

.entry__menu-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: min(92vw, 28rem);
  height: 100%;
  padding: clamp(1.25rem, 3vw, 2rem);
  background: #fafafa;
  color: #0a0a0b;
  display: flex;
  flex-direction: column;
  will-change: transform;
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.18);
}

.entry__menu-close {
  align-self: flex-end;
  margin-bottom: clamp(2rem, 8vh, 4rem);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.entry__menu-close-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  color: #888;
  will-change: transform;
}

.entry__menu-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
}

.entry__menu-link {
  display: block;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  padding: 0.15rem 0;
}

.entry__menu-link-inner {
  display: block;
  font-size: clamp(2.25rem, 6vw, 3.25rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  will-change: transform;
  transition: opacity 0.3s var(--ease-mechanical);
}

.entry__menu-link:hover .entry__menu-link-inner {
  opacity: 0.55;
}

.entry__menu-credits {
  display: inline-block;
  overflow: hidden;
  margin-bottom: 2rem;
  text-decoration: none;
  color: #6b28d9;
  font-family: var(--font-mono);
  font-size: 0.875rem;
}

.entry__menu-credits-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  will-change: transform;
}

.entry__menu-arrow {
  font-size: 0.75rem;
}

.entry__menu-footer {
  padding-top: 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.entry__menu-footer-label {
  display: block;
  margin-bottom: 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b28d9;
}

.entry__menu-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.entry__menu-footer-link {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  color: #333;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.25s var(--ease-mechanical);
}

.entry__menu-footer-link:hover {
  opacity: 0.55;
}

@media (max-width: 640px) {
  .entry__menu-panel {
    width: min(96vw, 100%);
  }

  .entry__menu-layer--1 {
    width: 1.25rem;
  }

  .entry__menu-layer--2 {
    width: 1.75rem;
  }

  .entry__menu-layer--3 {
    width: 0.75rem;
  }
}
</style>
