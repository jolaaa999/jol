<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AmbientShell from '@/components/ui/AmbientShell.vue'
import GlassCard from '@/components/ui/GlassCard.vue'
import { useEntryPage, type EntryMenuItem } from '@/composables/useEntryPage'
import { usePageTransition } from '@/composables/usePageTransition'

/** 页面根元素 */
const rootRef = ref<HTMLElement | null>(null)
/** Vue Router */
const router = useRouter()

/** 菜单关闭后延迟导航的定时器 */
let navigateTimeoutId = 0

/** 侧边菜单项 */
const menuItems: EntryMenuItem[] = [
  { id: 'home', label: '首页', href: '/blog', index: '01' },
  { id: 'poetry', label: '诗文', href: '/blog#poetry', index: '02' },
  { id: 'reflections', label: '有感', href: '/blog#reflections', index: '03' },
  { id: 'contact', label: '联系', href: 'mailto:hello@jol.dev', index: '04' },
]

/** 快捷入口卡片 */
const quickLinks = [
  {
    code: '01',
    title: '诗文',
    tag: 'Poetry Stream',
    desc: '月色、风场与拓扑 — 以诗记录界面背后的感知。',
    href: '/blog#poetry',
  },
  {
    code: '02',
    title: '有感',
    tag: 'Reflection Stream',
    desc: '关于克制、物理与暗色留白的短篇笔记。',
    href: '/blog#reflections',
  },
]

const { menuOpen, isExiting, toggleMenu, closeMenu, playPageExit } = useEntryPage(rootRef)
const { markFromEntry, beginTransition, endTransition } = usePageTransition()

/** 带退场动画的路由跳转 */
function navigateWithTransition(href: string): void {
  if (isExiting.value) return

  const delay = menuOpen.value ? 420 : 0
  closeMenu()

  if (href.startsWith('mailto:')) {
    window.location.href = href
    return
  }

  clearTimeout(navigateTimeoutId)
  navigateTimeoutId = window.setTimeout(() => {
    beginTransition()
    markFromEntry()
    playPageExit(() => {
      const hashIdx = href.indexOf('#')
      if (hashIdx === -1) {
        router.push(href).finally(endTransition)
        return
      }
      const path = href.slice(0, hashIdx)
      const hash = href.slice(hashIdx)
      router.push({ path, hash }).finally(endTransition)
    })
  }, delay)
}

/** 导航至目标路径 */
function navigateTo(href: string): void {
  navigateWithTransition(href)
}

onUnmounted(() => {
  clearTimeout(navigateTimeoutId)
})

/** 主 CTA：进入博客 */
function enterBlog(): void {
  navigateWithTransition('/blog')
}
</script>

<template>
  <div
    ref="rootRef"
    class="entry"
    :class="{ 'entry--menu-open': menuOpen, 'entry--exiting': isExiting }"
  >
    <AmbientShell />

    <div class="entry__exit-veil" data-exit-veil aria-hidden="true" />

    <header class="entry__header glass-panel" data-entry-header>
      <div class="entry__header-inner">
        <div class="entry__brand" data-hero-block>
          <span class="entry__brand-mark" />
          <span class="entry__brand-text">JOL</span>
          <span class="industrial-label entry__brand-sub">personal blog</span>
        </div>

        <button
          type="button"
          class="entry__menu-trigger"
          data-hero-block
          :aria-expanded="menuOpen"
          aria-controls="entry-menu"
          @click="toggleMenu"
        >
          <span class="entry__menu-trigger-label industrial-label">Navigate</span>
          <span class="entry__menu-icon" aria-hidden="true">+</span>
        </button>
      </div>
      <div class="accent-line" />
    </header>

    <main class="entry__shell" data-entry-shell>
      <section class="entry__hero-panel" data-hero-panel aria-labelledby="entry-title">
        <div class="entry__hero-accent" aria-hidden="true" />

        <div class="entry__hero-copy">
          <p class="entry__eyebrow industrial-label" data-hero-block>Personal Interface Layer</p>
          <div class="entry__rule" data-hero-line aria-hidden="true" />

          <h1 id="entry-title" class="entry__title" data-hero-block>
            你好，我是 <span class="entry__title-accent">JOL</span>
          </h1>

          <p class="entry__bio" data-hero-block>
            开发者与创作者。在精确工程与流动美学之间，搭建可被再次点亮的数字界面。
          </p>

          <div class="entry__readout" aria-label="入口状态" data-hero-block>
            <div class="entry__readout-row">
              <span class="entry__readout-label">status</span>
              <span class="entry__readout-value">
                <span class="entry__status-dot" />
                ready
              </span>
            </div>
            <div class="entry__readout-row">
              <span class="entry__readout-label">modules</span>
              <span class="entry__readout-value">blog / poetry / reflections</span>
            </div>
            <div class="entry__readout-row">
              <span class="entry__readout-label">signal</span>
              <span class="entry__readout-value entry__readout-value--accent">2026-08-26</span>
            </div>
          </div>

          <div class="entry__actions" data-hero-block>
            <button type="button" class="entry__cta entry__cta--primary" @click="enterBlog">
              <span class="entry__cta-index">00</span>
              <span>进入博客</span>
              <span class="entry__cta-arrow" aria-hidden="true">→</span>
            </button>
            <a class="entry__cta entry__cta--ghost" href="mailto:hello@jol.dev">
              发送邮件联系
            </a>
          </div>
        </div>
      </section>

      <aside class="entry__aside">
        <GlassCard
          v-for="link in quickLinks"
          :key="link.code"
          :title="link.title"
          :code="link.code"
          :tag="link.tag"
          class="entry__quick-card"
          data-hero-panel
        >
          <button
            type="button"
            class="entry__quick-link"
            :aria-label="`前往${link.title}`"
            @click="navigateTo(link.href)"
          >
            <p class="entry__quick-desc" data-hero-block>{{ link.desc }}</p>
            <span class="entry__quick-cta industrial-label" data-hero-block>
              open stream
              <span aria-hidden="true">↗</span>
            </span>
          </button>
          <template #footer>
            <div class="entry__signal-meter" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </template>
        </GlassCard>
      </aside>
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
        <div class="entry__menu-stack">
          <div class="entry__menu-layer entry__menu-layer--1" data-menu-layer="1" />
          <div class="entry__menu-layer entry__menu-layer--2" data-menu-layer="2" />
          <aside class="entry__menu-panel glass-panel" data-menu-panel>
            <button type="button" class="entry__menu-close" aria-label="关闭菜单" @click="closeMenu">
              <span class="entry__menu-close-mask" data-menu-text-mask>
                <span class="entry__menu-close-inner" data-menu-text-inner>
                  <span>Close</span>
                  <span aria-hidden="true">×</span>
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
                  <span class="entry__menu-link-inner" data-menu-nav-text>
                    <span class="entry__menu-link-index">{{ item.index }}</span>
                    {{ item.label }}
                  </span>
                </span>
              </a>
            </nav>

            <a
              class="entry__menu-credits"
              href="https://github.com/jolaaa999/jol"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="entry__menu-credits-mask" data-menu-text-mask>
                <span class="entry__menu-credits-inner" data-menu-text-inner>
                  <span>Credits</span>
                  <span class="entry__menu-arrow" aria-hidden="true">↗</span>
                </span>
              </span>
            </a>

            <footer class="entry__menu-footer">
              <span class="entry__menu-footer-label-mask" data-menu-text-mask>
                <span class="entry__menu-footer-label industrial-label" data-menu-text-inner>Socials</span>
              </span>
              <div class="entry__menu-footer-links">
                <a
                  class="entry__menu-footer-link"
                  href="https://github.com/jolaaa999/jol"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span class="entry__menu-footer-link-mask" data-menu-text-mask>
                    <span data-menu-text-inner>GitHub</span>
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
  color: var(--color-foreground);
}

.entry__exit-veil {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  opacity: 0;
  background:
    linear-gradient(160deg, rgba(8, 9, 11, 0.92), rgba(8, 9, 11, 0.98)),
    radial-gradient(circle at 70% 20%, rgba(0, 212, 170, 0.08), transparent 42%);
}

.entry__header {
  position: relative;
  z-index: 20;
  height: var(--nav-height);
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
}

.entry__header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 1.5rem;
}

.entry__brand {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.entry__brand-mark {
  width: 6px;
  height: 6px;
  background: var(--color-accent);
  transform: rotate(45deg);
}

.entry__brand-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  color: var(--color-foreground);
}

.entry__brand-sub {
  margin-left: 0.35rem;
  opacity: 0.6;
}

.entry__menu-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.22);
  color: var(--color-foreground);
  cursor: pointer;
  transition:
    border-color 0.35s var(--ease-mechanical),
    background 0.35s var(--ease-mechanical);
}

.entry__menu-trigger:hover {
  border-color: rgba(0, 212, 170, 0.35);
  background: rgba(0, 212, 170, 0.06);
}

.entry__menu-trigger-label {
  color: var(--color-muted);
}

.entry__menu-icon {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 300;
  line-height: 1;
  transition: transform 0.45s var(--ease-damped);
}

.entry--menu-open .entry__menu-icon {
  transform: rotate(45deg);
}

.entry__shell {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(18rem, 0.88fr);
  gap: 1rem;
  max-width: var(--content-max);
  min-height: calc(100dvh - var(--nav-height));
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.entry__hero-panel {
  position: relative;
  display: grid;
  align-content: space-between;
  min-height: 24rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.42));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 60px rgba(0, 0, 0, 0.34);
  overflow: hidden;
}

.entry__hero-accent {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.18), transparent),
    linear-gradient(0deg, transparent 72%, rgba(255, 255, 255, 0.06));
  clip-path: polygon(0 78%, 100% 47%, 100% 62%, 0 93%);
  opacity: 0.7;
  pointer-events: none;
}

.entry__hero-copy {
  position: relative;
  z-index: 1;
}

.entry__eyebrow {
  margin: 0 0 1rem;
  color: var(--color-accent-cyan);
}

.entry__rule {
  width: 4.5rem;
  height: 1px;
  margin-bottom: 1.5rem;
  background: linear-gradient(90deg, var(--color-accent-cyan), transparent);
}

.entry__title {
  max-width: 11em;
  margin: 0;
  font-size: clamp(2.25rem, 6vw, 4.5rem);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: 0;
  color: #f6f6f2;
}

.entry__title-accent {
  color: var(--color-accent-cyan);
}

.entry__bio {
  max-width: 34rem;
  margin: 1.35rem 0 0;
  font-size: var(--text-base);
  line-height: 1.9;
  color: rgba(232, 232, 234, 0.72);
}

.entry__readout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 2.25rem;
}

.entry__readout-row {
  min-width: 0;
  padding: 0.85rem 0.9rem;
  border-left: 1px solid rgba(0, 212, 170, 0.45);
  background: rgba(0, 0, 0, 0.2);
}

.entry__readout-label,
.entry__readout-value {
  display: block;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.entry__readout-label {
  margin-bottom: 0.35rem;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: var(--color-muted);
}

.entry__readout-value {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--color-foreground);
}

.entry__readout-value--accent {
  color: var(--color-accent);
}

.entry__status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-accent-cyan);
  box-shadow: 0 0 10px var(--color-accent-cyan-dim);
}

.entry__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-top: 2.25rem;
}

.entry__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1.35rem;
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.35s var(--ease-mechanical),
    background 0.35s var(--ease-mechanical),
    border-color 0.35s var(--ease-mechanical),
    color 0.35s var(--ease-mechanical);
}

.entry__cta--primary {
  border: 1px solid rgba(0, 212, 170, 0.35);
  background:
    linear-gradient(135deg, rgba(0, 212, 170, 0.14), rgba(0, 212, 170, 0.04)),
    rgba(8, 9, 11, 0.55);
  color: var(--color-foreground);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.28);
}

.entry__cta--primary:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 212, 170, 0.55);
  background:
    linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(0, 212, 170, 0.06)),
    rgba(8, 9, 11, 0.65);
}

.entry__cta-index {
  color: var(--color-accent-cyan);
  font-size: 0.7rem;
}

.entry__cta--ghost {
  border: none;
  background: none;
  color: var(--color-foreground-dim);
  padding: 0.35rem 0.75rem;
}

.entry__cta--ghost:hover {
  color: var(--color-foreground);
}

.entry__cta-arrow {
  opacity: 0.65;
  transition: transform 0.35s var(--ease-mechanical);
}

.entry__cta--primary:hover .entry__cta-arrow {
  transform: translateX(3px);
  opacity: 1;
}

.entry__aside {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.entry__quick-card {
  flex: 1;
}

.entry__quick-link {
  display: grid;
  gap: 1.25rem;
  width: 100%;
  min-height: 9.5rem;
  padding: 1.25rem 1.5rem 1.5rem;
  color: inherit;
  text-align: left;
  background:
    linear-gradient(150deg, rgba(0, 212, 170, 0.08), transparent 42%),
    transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.35s var(--ease-mechanical);
}

.entry__quick-link:hover {
  background:
    linear-gradient(150deg, rgba(0, 212, 170, 0.14), transparent 48%),
    rgba(255, 255, 255, 0.02);
}

.entry__quick-desc {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.75;
  color: rgba(232, 232, 234, 0.68);
}

.entry__quick-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-accent-cyan);
}

.entry__signal-meter {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.entry__signal-meter span {
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.entry__signal-meter span:nth-child(2),
.entry__signal-meter span:nth-child(4) {
  background: rgba(0, 212, 170, 0.72);
}

/* ── 工业风侧栏菜单 ── */
.entry__menu {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.entry__menu--open {
  pointer-events: auto;
}

.entry__menu-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(4, 6, 10, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  will-change: opacity;
}

.entry__menu-drawer {
  --menu-layer-1-w: clamp(1.5rem, 2.8vw, 2.25rem);
  --menu-layer-2-w: clamp(2.25rem, 4.2vw, 3.5rem);
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
  overflow: hidden;
}

.entry__menu-layer,
.entry__menu-panel {
  position: absolute;
  top: 0;
  height: 100%;
  transform-origin: right center;
  backface-visibility: hidden;
  transform: scaleX(0);
  will-change: transform;
}

.entry__menu-layer--1 {
  right: 0;
  width: var(--menu-layer-1-w);
  background: #0a0e14;
  z-index: 3;
}

.entry__menu-layer--2 {
  right: var(--menu-layer-1-w);
  width: var(--menu-layer-2-w);
  background: linear-gradient(180deg, rgba(0, 212, 170, 0.55) 0%, rgba(0, 140, 110, 0.35) 100%);
  z-index: 2;
}

.entry__menu-panel {
  right: calc(var(--menu-layer-1-w) + var(--menu-layer-2-w));
  width: var(--menu-panel-w);
  z-index: 1;
  padding: clamp(1.35rem, 3vw, 2.15rem) clamp(1.35rem, 3.5vw, 2.35rem);
  border-radius: 0;
  border-top: none;
  border-right: none;
  border-bottom: none;
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
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.28);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-foreground);
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
  font-size: clamp(2.25rem, 5.2vw, 3.25rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.06;
}

.entry__menu-link-inner {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  transition: color 0.28s var(--ease-mechanical);
}

.entry__menu-link-index {
  font-family: var(--font-mono);
  font-size: 0.42em;
  font-weight: 400;
  letter-spacing: 0.1em;
  color: var(--color-accent-cyan);
}

.entry__menu-link:hover .entry__menu-link-inner {
  color: var(--color-accent-cyan);
}

.entry__menu-credits {
  display: inline-block;
  margin-bottom: clamp(1.5rem, 4vh, 2.5rem);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--color-foreground-dim);
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

.entry__menu-arrow {
  font-size: 0.75rem;
}

.entry__menu-footer {
  padding-top: 1.35rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.entry__menu-footer-label-mask {
  display: block;
  overflow: hidden;
  height: 1.35em;
  margin-bottom: 0.75rem;
}

.entry__menu-footer-label {
  display: block;
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
  color: var(--color-foreground-dim);
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
  transition: color 0.25s var(--ease-mechanical);
}

.entry__menu-footer-link:hover span {
  color: var(--color-accent-cyan);
}

@media (max-width: 960px) {
  .entry__shell {
    grid-template-columns: 1fr;
  }

  .entry__hero-panel {
    min-height: 22rem;
  }
}

@media (max-width: 620px) {
  .entry__shell {
    padding: 1rem 0.85rem 2rem;
  }

  .entry__hero-panel {
    padding: 1.35rem;
  }

  .entry__readout {
    grid-template-columns: 1fr;
    margin-top: 2rem;
  }

  .entry__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .entry__cta--primary {
    justify-content: center;
  }

  .entry__menu-drawer {
    --menu-layer-1-w: 1.15rem;
    --menu-layer-2-w: 1.75rem;
    --menu-panel-w: min(88vw, 20rem);
  }
}
</style>
