<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import { useGithubWorks } from '@/composables/useGithubWorks'
import type { WorkProject } from '@/types/work'
import ArchiveHeader from '@/components/works/archive/ArchiveHeader.vue'
import ArchiveIndex from '@/components/works/archive/ArchiveIndex.vue'
import ArchiveFeatured from '@/components/works/archive/ArchiveFeatured.vue'
import ArchiveWorkRow from '@/components/works/archive/ArchiveWorkRow.vue'
import '@/styles/archive.css'

const sectionRef = ref<HTMLElement | null>(null)
const activeId = ref<string>()
const { works, status } = useGithubWorks()

const workCount = computed(() => works.value.length)

/** 按 stars / demo / 描述长度选取 Featured，不改变数据源 */
function pickFeaturedIndex(list: WorkProject[]): number {
  if (!list.length) return -1

  let best = 0
  let bestScore = -1

  list.forEach((work, i) => {
    const score =
      work.stars * 20 +
      (work.demoUrl ? 15 : 0) +
      Math.min(work.description.length, 120) / 4
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })

  return best
}

const featuredIndex = computed(() => pickFeaturedIndex(works.value))

const featuredWork = computed(() => {
  const i = featuredIndex.value
  return i >= 0 ? works.value[i] : undefined
})

const selectedWorks = computed(() =>
  works.value.filter((_, i) => i !== featuredIndex.value),
)

function scrollToWork(id: string): void {
  activeId.value = id
  document.getElementById(`work-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  })
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function playSectionEntrance(): void {
  if (!sectionRef.value) return

  const blocks = sectionRef.value.querySelectorAll('[data-archive-block]')

  if (prefersReducedMotion()) {
    gsap.set(blocks, { opacity: 1, y: 0 })
    return
  }

  gsap.set(blocks, { y: 28, opacity: 0 })
  gsap.to(blocks, {
    y: 0,
    opacity: 1,
    duration: 0.85,
    stagger: 0.1,
    ease: 'power3.out',
    clearProps: 'transform',
  })
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
  <section
    ref="sectionRef"
    id="works"
    class="archive"
    aria-labelledby="works-title"
  >
    <div class="archive__ambient" aria-hidden="true" />

    <div class="archive__inner">
      <ArchiveHeader
        data-archive-block
        :count="workCount"
        :status="status"
      />

      <template v-if="status === 'loading'">
        <div class="archive-loading" data-archive-block aria-hidden="true">
          <div class="archive-loading__line archive-loading__line--long" />
          <div class="archive-loading__line" />
          <div class="archive-loading__line archive-loading__line--short" />
          <div class="archive-loading__gap" />
          <div class="archive-loading__line archive-loading__line--featured" />
          <div class="archive-loading__line" />
          <div class="archive-loading__line archive-loading__line--short" />
        </div>
      </template>

      <template v-else-if="works.length">
        <ArchiveIndex
          data-archive-block
          :works="works"
          :active-id="activeId"
          @select="scrollToWork"
        />

        <ArchiveFeatured
          v-if="featuredWork"
          data-archive-block
          :work="featuredWork"
          :index="featuredIndex"
        />

        <section
          v-if="selectedWorks.length"
          class="archive-selected"
          data-archive-block
          aria-label="精选作品"
        >
          <header class="archive-selected__head">
            <p class="archive-selected__label">Selected Works</p>
            <div class="archive-selected__rule" aria-hidden="true" />
          </header>

          <div class="archive-selected__list">
            <ArchiveWorkRow
              v-for="work in selectedWorks"
              :key="work.id"
              :work="work"
              :index="works.findIndex((w) => w.id === work.id)"
            />
          </div>
        </section>
      </template>

      <footer class="archive-footer" data-archive-block>
        <p class="archive-footer__label">External Archive</p>
        <a
          class="archive-footer__link"
          href="https://github.com/jolaaa999"
          target="_blank"
          rel="noopener noreferrer"
        >
          Browse All Repositories ↗
        </a>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.archive {
  position: relative;
  z-index: 5;
  color: var(--arch-fg);
}

.archive__ambient {
  position: absolute;
  inset: -8% -4%;
  pointer-events: none;
  background:
    radial-gradient(ellipse 50% 40% at 85% 12%, rgba(113, 135, 255, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse 40% 35% at 10% 88%, rgba(154, 124, 255, 0.05) 0%, transparent 50%);
}

.archive__inner {
  position: relative;
  max-width: var(--arch-max);
  margin: 0 auto;
  padding: clamp(4rem, 10vh, 6.5rem) clamp(1.5rem, 4vw, 2.75rem) clamp(5rem, 12vh, 7rem);
}

/* ── Selected Works ── */
.archive-selected {
  margin-bottom: clamp(4rem, 10vh, 6rem);
}

.archive-selected__head {
  margin-bottom: clamp(2rem, 5vh, 3rem);
}

.archive-selected__label {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-selected__rule {
  height: 1px;
  background: var(--arch-border);
}

/* ── Footer ── */
.archive-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-top: clamp(2.5rem, 5vh, 3.5rem);
  border-top: 1px solid var(--arch-border);
}

.archive-footer__label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-footer__link {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--arch-fg-muted);
  transition:
    color 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
}

.archive-footer__link:hover {
  color: var(--arch-accent);
  transform: translateX(4px);
}

/* ── Loading ── */
.archive-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.archive-loading__gap {
  height: 3rem;
}

.archive-loading__line {
  height: 1px;
  background: var(--arch-border);
  animation: arch-load 1.4s ease-in-out infinite;
}

.archive-loading__line--long {
  width: 100%;
}

.archive-loading__line--short {
  width: 42%;
}

.archive-loading__line--featured {
  height: 4rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--arch-border);
  animation: arch-load 1.4s ease-in-out infinite;
}

@keyframes arch-load {
  0%,
  100% {
    opacity: 0.35;
  }

  50% {
    opacity: 0.85;
  }
}

@media (max-width: 620px) {
  .archive__inner {
    padding: 3rem 1.25rem 4.5rem;
  }

  .archive-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
