<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import WorkCard from '@/components/works/WorkCard.vue'
import { useGithubWorks } from '@/composables/useGithubWorks'
import type { WorkProject } from '@/types/work'

const sectionRef = ref<HTMLElement | null>(null)
const { works, status } = useGithubWorks()

const workCount = computed(() => works.value.length)

/** 仅按简介长度分配网格占位，不改变卡片内部纵向结构 */
const DESC_COMPACT_MAX = 44
const DESC_WIDE_MIN = 88
const DESC_FEATURED_MIN = 120

interface CardLayout {
  variant: 'compact' | 'default' | 'wide' | 'featured'
  cellClass: string
}

function resolveCardLayout(index: number, work: WorkProject): CardLayout {
  const descLen = (work.description ?? '').trim().length

  if (index === 0 && descLen >= DESC_FEATURED_MIN) {
    return { variant: 'featured', cellClass: 'works__cell--featured' }
  }

  if (descLen <= DESC_COMPACT_MAX) {
    return { variant: 'compact', cellClass: 'works__cell--compact' }
  }

  if (descLen >= DESC_WIDE_MIN) {
    return { variant: 'wide', cellClass: 'works__cell--wide' }
  }

  return { variant: 'default', cellClass: '' }
}

const workLayouts = computed(() =>
  works.value.map((work, index) => resolveCardLayout(index, work)),
)

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 区块入场：标题错落 → 分隔线展开 → 卡片模糊浮现 */
function playSectionEntrance(): void {
  if (!sectionRef.value) return

  const header = sectionRef.value.querySelector('[data-works-header]')
  const rule = sectionRef.value.querySelector('[data-works-rule]')
  const cards = sectionRef.value.querySelectorAll('[data-work-card]')

  if (prefersReducedMotion()) {
    gsap.set([header, rule, cards], { opacity: 1, y: 0, scaleX: 1, filter: 'none' })
    return
  }

  gsap.set(header, { y: 32, opacity: 0 })
  gsap.set(rule, { scaleX: 0, transformOrigin: 'left center' })
  gsap.set(cards, { y: 36, opacity: 0, filter: 'blur(10px)' })

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

  tl.to(header, { y: 0, opacity: 1, duration: 0.82 }, 0)
    .to(rule, { scaleX: 1, duration: 0.9, ease: 'expo.out' }, 0.18)
    .to(
      cards,
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.78,
        stagger: {
          each: 0.07,
          from: 'start',
          ease: 'power2.out',
        },
        clearProps: 'filter',
      },
      0.32,
    )
}

watch(
  works,
  async (list) => {
    if (!list.length) return
    await nextTick()
    playSectionEntrance()
  },
  { flush: 'post' },
)

onMounted(() => {
  if (works.value.length) {
    nextTick(() => playSectionEntrance())
  }
})
</script>

<template>
  <section ref="sectionRef" id="works" class="works" aria-labelledby="works-title">
    <header class="works__intro" data-works-header>
      <div class="works__intro-copy">
        <h2 id="works-title" class="works__title">作品档案</h2>
        <p class="works__lead">
          从 GitHub 同步的实验与产品。界面、工具，以及一些仍在成形中的想法。
        </p>
      </div>

      <div class="works__intro-aside">
        <div class="works__stat">
          <span class="works__stat-value">{{ workCount }}</span>
          <span class="works__stat-label">projects indexed</span>
        </div>
        <div class="works__sync" aria-label="作品同步状态">
          <span class="works__sync-dot" :class="status" />
          <span class="works__sync-text">
            {{ status === 'synced' ? 'github synced' : status === 'loading' ? 'syncing' : 'local cache' }}
          </span>
        </div>
      </div>
    </header>

    <div class="works__rule" data-works-rule aria-hidden="true" />

    <div v-if="status === 'loading'" class="works__mosaic works__mosaic--loading">
      <div class="works__skeleton works__skeleton--featured" />
      <div class="works__skeleton works__skeleton--wide" />
      <div class="works__skeleton" />
      <div class="works__skeleton" />
      <div class="works__skeleton works__skeleton--wide" />
      <div class="works__skeleton" />
    </div>

    <div v-else class="works__mosaic">
      <WorkCard
        v-for="(work, index) in works"
        :key="work.id"
        :work="work"
        :variant="workLayouts[index]!.variant"
        :class="workLayouts[index]!.cellClass"
      />
    </div>

    <footer class="works__footer">
      <a
        class="works__github"
        href="https://github.com/jolaaa999"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>浏览 GitHub 全部仓库</span>
        <span class="works__github-arrow" aria-hidden="true">↗</span>
      </a>
    </footer>
  </section>
</template>

<style scoped>
.works {
  position: relative;
  z-index: 5;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: clamp(4rem, 10vh, 6.5rem) clamp(1.5rem, 4vw, 2.75rem) clamp(5rem, 12vh, 7rem);
}

.works__intro {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(10rem, 0.35fr);
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: end;
  margin-bottom: 1.75rem;
}

.works__title {
  margin: 0 0 0.85rem;
  font-size: clamp(2.5rem, 6.5vw, 4.25rem);
  font-weight: 800;
  line-height: 0.96;
  letter-spacing: -0.035em;
  color: var(--fluid-fg);
}

.works__lead {
  margin: 0;
  max-width: 28rem;
  font-family: var(--font-mono);
  font-size: clamp(0.8125rem, 1.5vw, 0.9rem);
  font-weight: 300;
  line-height: 1.8;
  color: var(--fluid-fg-muted);
}

.works__intro-aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.25rem;
  text-align: right;
}

.works__stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.works__stat-value {
  font-size: clamp(2.5rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--fluid-fg);
}

.works__stat-label {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fluid-fg-dim);
}

.works__sync {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.works__sync-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
}

.works__sync-dot.synced {
  background: #9ed8ff;
  box-shadow: 0 0 10px rgba(158, 216, 255, 0.55);
}

.works__sync-dot.loading {
  background: #c084fc;
  animation: works-pulse 1.2s ease-in-out infinite;
}

.works__sync-text {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fluid-fg-dim);
}

.works__rule {
  height: 1px;
  margin-bottom: clamp(1.75rem, 4vh, 2.5rem);
  background: linear-gradient(
    90deg,
    rgba(158, 216, 255, 0.55) 0%,
    rgba(192, 132, 252, 0.35) 42%,
    rgba(255, 255, 255, 0.06) 100%
  );
  transform-origin: left center;
}

/* ── Bento 马赛克网格 ── */
.works__mosaic {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: auto;
  gap: 0.75rem;
  align-items: start;
}

.works__mosaic > :deep(.works__cell--featured) {
  grid-column: span 8;
  grid-row: span 2;
}

.works__mosaic > :deep(.works__cell--wide) {
  grid-column: span 8;
}

.works__mosaic > :deep(.works__cell--compact),
.works__mosaic > :deep(.work-card:not(.works__cell--featured):not(.works__cell--wide)) {
  grid-column: span 4;
}

.works__mosaic--loading {
  pointer-events: none;
}

.works__skeleton {
  grid-column: span 4;
  min-height: 9rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.025);
  animation: works-pulse 1.5s ease-in-out infinite;
}

.works__skeleton--featured {
  grid-column: span 8;
  grid-row: span 2;
  min-height: 16rem;
}

.works__skeleton--wide {
  grid-column: span 8;
}

.works__footer {
  margin-top: clamp(2.5rem, 5vh, 3.5rem);
  display: flex;
  justify-content: center;
}

.works__github {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem 1.35rem;
  border: 1px solid var(--fluid-border);
  border-radius: 999px;
  background: var(--fluid-surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--fluid-fg-muted);
  transition:
    transform 0.35s var(--ease-mechanical),
    border-color 0.35s var(--ease-mechanical),
    color 0.35s var(--ease-mechanical);
}

.works__github:hover {
  transform: translateY(-2px);
  border-color: var(--fluid-border);
  color: var(--fluid-fg);
}

.works__github-arrow {
  transition: transform 0.35s var(--ease-mechanical);
}

.works__github:hover .works__github-arrow {
  transform: translate(2px, -2px);
}

@keyframes works-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (max-width: 960px) {
  .works__mosaic {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .works__mosaic > :deep(.works__cell--featured),
  .works__mosaic > :deep(.works__cell--wide) {
    grid-column: span 6;
    grid-row: span 1;
  }

  .works__mosaic > :deep(.works__cell--compact),
  .works__mosaic > :deep(.work-card:not(.works__cell--featured):not(.works__cell--wide)) {
    grid-column: span 3;
  }

  .works__skeleton--featured,
  .works__skeleton--wide {
    grid-column: span 6;
    grid-row: span 1;
  }

  .works__skeleton--wide,
  .works__skeleton:not(.works__skeleton--featured):not(.works__skeleton--wide) {
    grid-column: span 3;
  }
}

@media (max-width: 620px) {
  .works {
    padding: 3rem 1.25rem 4.5rem;
  }

  .works__intro {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .works__intro-aside {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }

  .works__mosaic {
    grid-template-columns: 1fr;
  }

  .works__mosaic > :deep(.work-card),
  .works__skeleton {
    grid-column: span 1 !important;
    grid-row: auto !important;
  }
}
</style>
