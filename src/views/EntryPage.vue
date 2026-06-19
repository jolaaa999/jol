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

const { menuOpen, toggleMenu, closeMenu } = useEntryPage(rootRef)
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
      <div class="entry__hero-block-mask">
        <p class="entry__eyebrow entry__iridescent entry__iridescent--hero" data-hero-block>HELLO, WORLD</p>
      </div>

      <h1 class="entry__headline" aria-label="Hi, I'm JOL">
        <span
          v-for="(char, i) in headlineChars"
          :key="`${char}-${i}`"
          class="entry__char-wrap"
        >
          <span class="entry__char entry__iridescent entry__iridescent--hero" data-hero-char>{{ char === ' ' ? '\u00A0' : char }}</span>
        </span>
      </h1>

      <div class="entry__hero-block-mask entry__hero-block-mask--bio">
        <p class="entry__bio entry__iridescent entry__iridescent--hero" data-hero-block>
          Developer &amp; creator. Building digital experiences that merge
          technical precision with fluid aesthetics.
        </p>
      </div>

      <div class="entry__hero-block-mask entry__hero-block-mask--actions">
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
      </div>
    </main>

    <div
      id="entry-menu"
      class="entry__menu"
      :class="{ 'entry__menu--open': menuOpen }"
      :aria-hidden="!menuOpen"
    >
      <div
        class="entry__menu-backdrop"
        data-menu-backdrop
        aria-hidden="true"
        @click="closeMenu"
      />

      <div class="entry__menu-drawer" data-menu-drawer>
        <!-- 三层右缘对齐、零间隙堆叠，从浏览器侧面连续推出 -->
        <div class="entry__menu-stack">
          <div class="entry__menu-layer entry__menu-layer--1" data-menu-layer="1" />
          <div class="entry__menu-layer entry__menu-layer--2" data-menu-layer="2" />
          <aside class="entry__menu-panel" data-menu-panel>
          <button type="button" class="entry__menu-close" @click="closeMenu">
            <span class="entry__menu-close-mask" data-menu-text-mask>
              <span class="entry__menu-close-inner" data-menu-text-inner>
                <span class="entry__iridescent entry__iridescent--menu">Close</span>
                <span class="entry__iridescent entry__iridescent--menu" aria-hidden="true">×</span>
              </span>
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
              <span class="entry__menu-link-mask" data-menu-text-mask>
                <span
                  class="entry__menu-link-inner entry__iridescent entry__iridescent--menu"
                  data-menu-nav-text
                >{{ item.label }}</span>
              </span>
            </a>
          </nav>

          <a
            class="entry__menu-credits"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="entry__menu-credits-mask" data-menu-text-mask>
              <span class="entry__menu-credits-inner" data-menu-text-inner>
                <span class="entry__iridescent entry__iridescent--menu">Credits</span>
                <span class="entry__menu-arrow entry__iridescent entry__iridescent--menu" aria-hidden="true">↗</span>
              </span>
            </span>
          </a>

          <footer class="entry__menu-footer">
            <span class="entry__menu-footer-label-mask" data-menu-text-mask>
              <span
                class="entry__menu-footer-label entry__iridescent entry__iridescent--menu"
                data-menu-text-inner
              >Socials</span>
            </span>
            <div class="entry__menu-footer-links">
              <button
                type="button"
                class="entry__menu-footer-link"
                @click="cyclePalette"
              >
                <span class="entry__menu-footer-link-mask" data-menu-text-mask>
                  <span class="entry__iridescent entry__iridescent--menu" data-menu-text-inner>切换背景</span>
                </span>
              </button>
              <a
                class="entry__menu-footer-link"
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="entry__menu-footer-link-mask" data-menu-text-mask>
                  <span class="entry__iridescent entry__iridescent--menu" data-menu-text-inner>GitHub</span>
                </span>
              </a>
            </div>
          </footer>
          </aside>
        </div>
      </div>
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
}

.entry__headline {
  margin: 0 0 1.5rem;
  font-size: clamp(2.75rem, 8vw, 5.5rem);
  font-weight: 700;
  line-height: 1.02;
  letter-spacing: -0.03em;
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

/* 块级 Hero 内容遮罩：配合 yPercent 从顶缘外落入 */
.entry__hero-block-mask {
  overflow: hidden;
}

.entry__hero-block-mask--bio {
  max-width: 32rem;
  margin: 0 0 2.25rem;
}

.entry__hero-block-mask--actions {
  display: flex;
  justify-content: center;
}

/* ── 炫彩渐变文字：与流体背景色板呼应 ── */
.entry__iridescent {
  display: inline-block;
  background-repeat: repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* 深色 Hero 背景：高亮流光，偏冷青 / 紫 / 品红 */
.entry__iridescent--hero {
  background-image: linear-gradient(
    115deg,
    #ffffff 0%,
    #9ed8ff 10%,
    #7c8cff 24%,
    #c084fc 38%,
    #f0abfc 50%,
    #22d3ee 64%,
    #60a5fa 78%,
    #ffffff 100%
  );
  background-size: 280% 100%;
  animation: entry-iridescent-flow 8s linear infinite;
}

/* 段落级 Hero 文字保持块级布局，渐变覆盖多行 */
.entry__eyebrow.entry__iridescent--hero,
.entry__bio.entry__iridescent--hero {
  display: block;
}

/* 浅色菜单面板：饱和深色系，保证白底可读 */
.entry__iridescent--menu {
  background-image: linear-gradient(
    115deg,
    #1a0a6e 0%,
    #3218c8 12%,
    #1a52e8 26%,
    #7c3aed 40%,
    #c026d3 54%,
    #0891b2 68%,
    #4338ca 82%,
    #1a0a6e 100%
  );
  background-size: 280% 100%;
  animation: entry-iridescent-flow 6.5s linear infinite;
}

@keyframes entry-iridescent-flow {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 280% 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry__iridescent--hero,
  .entry__iridescent--menu {
    animation: none;
    background-size: 100% 100%;
    background-position: 0% 50%;
  }
}

.entry__bio {
  margin: 0;
  font-family: var(--font-mono);
  font-size: clamp(0.8125rem, 1.6vw, 0.9375rem);
  font-weight: 300;
  line-height: 1.75;
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

/* ── 多层侧栏菜单 ── */
.entry__menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  visibility: hidden;
}

.entry__menu--open {
  pointer-events: auto;
  visibility: visible;
}

.entry__menu-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 6, 14, 0.42);
  opacity: 0;
}

.entry__menu-drawer {
  /* 抽屉总宽 = 两层色带 + 内容面板，锚定在视口右侧 */
  --menu-layer-1-w: clamp(1.75rem, 3.2vw, 2.75rem);
  --menu-layer-2-w: clamp(2.75rem, 5vw, 4.25rem);
  --menu-panel-w: clamp(17rem, 34vw, 24rem);
  position: absolute;
  top: 0;
  right: 0;
  width: calc(var(--menu-layer-1-w) + var(--menu-layer-2-w) + var(--menu-panel-w));
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.entry__menu-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.entry__menu-layer,
.entry__menu-panel {
  position: absolute;
  top: 0;
  height: 100%;
  /* 统一以浏览器右缘为变换原点，层间无位移缝隙 */
  transform-origin: right center;
  backface-visibility: hidden;
  will-change: transform, clip-path;
}

/* 黑色贴浏览器右缘 → 紫 → 白，绝对定位保证零间隙 */
.entry__menu-layer--1 {
  right: 0;
  width: var(--menu-layer-1-w);
  background: #0a0e1a;
  z-index: 3;
}

.entry__menu-layer--2 {
  right: var(--menu-layer-1-w);
  width: var(--menu-layer-2-w);
  background: linear-gradient(180deg, #3218c8 0%, #1a52e8 55%, #2a18a8 100%);
  z-index: 2;
}

.entry__menu-panel {
  right: calc(var(--menu-layer-1-w) + var(--menu-layer-2-w));
  width: var(--menu-panel-w);
  z-index: 1;
  padding: clamp(1.35rem, 3vw, 2.15rem) clamp(1.35rem, 3.5vw, 2.35rem);
  background: #fafafa;
  color: #0a0a0b;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.entry__menu-close {
  align-self: flex-end;
  margin: 0 0 clamp(2.5rem, 9vh, 5rem);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.entry__menu-close-mask,
.entry__menu-link-mask,
.entry__menu-credits-mask,
.entry__menu-footer-label-mask,
.entry__menu-footer-link-mask {
  overflow: hidden;
}

.entry__menu-close-inner,
.entry__menu-link-inner,
.entry__menu-credits-inner,
.entry__menu-footer-label,
.entry__menu-footer-link-mask [data-menu-text-inner] {
  /* GSAP 入场前 fallback：内层藏在遮罩顶缘外 */
  transform: translateY(-110%);
  will-change: transform;
}

.entry__menu-close-mask {
  display: block;
  overflow: hidden;
  height: 2.125rem;
}

.entry__menu-close-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.09);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  will-change: transform;
}

.entry__menu-close-inner .entry__iridescent--menu {
  display: inline-block;
}

.entry__menu-nav {
  display: flex;
  flex-direction: column;
  gap: clamp(0.15rem, 0.8vh, 0.35rem);
  flex: 1;
}

.entry__menu-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.entry__menu-link-mask {
  display: block;
  overflow: hidden;
  height: 1.06em;
  font-size: clamp(2.5rem, 5.8vw, 3.65rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.06;
}

.entry__menu-link-inner {
  display: block;
  transition: filter 0.28s var(--ease-mechanical);
}

.entry__menu-link-inner.entry__iridescent--menu {
  display: block;
}

.entry__menu-link:hover .entry__menu-link-inner {
  filter: brightness(1.12) saturate(1.15);
}

.entry__menu-credits {
  display: inline-block;
  margin-bottom: clamp(1.5rem, 4vh, 2.5rem);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.875rem;
}

.entry__menu-credits-mask {
  display: block;
  overflow: hidden;
  height: 1.4em;
  line-height: 1.4;
}

.entry__menu-credits-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.entry__menu-credits-inner .entry__iridescent--menu {
  display: inline-block;
}

.entry__menu-arrow {
  font-size: 0.75rem;
}

.entry__menu-footer {
  padding-top: 1.35rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.entry__menu-footer-label-mask {
  display: block;
  overflow: hidden;
  height: 1.35em;
  margin-bottom: 0.75rem;
}

.entry__menu-footer-label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.entry__menu-footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 1.35rem;
}

.entry__menu-footer-link {
  padding: 0;
  border: none;
  background: none;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.entry__menu-footer-link-mask {
  display: block;
  overflow: hidden;
  height: 1.35em;
  line-height: 1.35;
}

.entry__menu-footer-link-mask span {
  display: block;
  transition: filter 0.25s var(--ease-mechanical);
}

.entry__menu-footer-link:hover span {
  filter: brightness(1.1) saturate(1.12);
}

@media (max-width: 640px) {
  .entry__menu-drawer {
    --menu-layer-1-w: 1.25rem;
    --menu-layer-2-w: 2rem;
    --menu-panel-w: min(88vw, 20rem);
  }
}
</style>
