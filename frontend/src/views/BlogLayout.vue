<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import gsap from 'gsap'
import GlassCard from '@/components/ui/GlassCard.vue'
import TagList from '@/components/blog/TagList.vue'
import { usePageTransition } from '@/composables/usePageTransition'
import { useBlogEntries } from '@/composables/useBlogEntries'
import { useSeo } from '@/composables/useSeo'

const { entries, status, allTags, fetchEntries } = useBlogEntries()

const featuredEntry = computed(() => entries.value[0])
const totalEntries = computed(() => entries.value.length)
const latestDate = computed(() => {
  const dates = entries.value.map((e) => e.date).sort().reverse()
  return dates[0] ?? '--'
})

const blogShellRef = ref<HTMLElement | null>(null)
const { consumeFromEntry, endTransition } = usePageTransition()

useSeo({
  title: 'Blog',
  description: 'Reflections on design, animation, and engineering.',
  path: '/blog',
})

function playEnterFromEntry(): void {
  if (!blogShellRef.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    endTransition()
    return
  }

  const panels = blogShellRef.value.querySelectorAll('[data-blog-panel]')

  gsap.fromTo(
    panels,
    { y: 22, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.72,
      stagger: 0.09,
      ease: 'power3.out',
      clearProps: 'transform',
      onComplete: endTransition,
    },
  )
}

onMounted(async () => {
  if (consumeFromEntry()) {
    playEnterFromEntry()
  }
  await fetchEntries()
})
</script>

<template>
  <main class="blog-layout">
    <div ref="blogShellRef" class="blog-shell">
      <section class="hero-panel glass-fluid" data-blog-panel aria-labelledby="blog-title">
        <div class="hero-copy">
          <p class="eyebrow iridescent iridescent--hero">Journal Operating Layer</p>
          <h1 id="blog-title" class="hero-title">
            在光和噪声之间，记录一些正在成形的想法。
          </h1>
          <p class="hero-text">
            这里收纳界面笔记和一些关于感知的短篇。它不追求喧哗，更像一张夜间工作台，留下可被再次点亮的线索。
          </p>
        </div>

        <div class="hero-readout" aria-label="博客状态">
          <div class="readout-row">
            <span class="readout-label">status</span>
            <span class="readout-value">
              <span class="status-dot" :class="status" />
              {{ status === 'synced' ? 'synced' : status === 'loading' ? 'syncing' : 'local' }}
            </span>
          </div>
          <div class="readout-row">
            <span class="readout-label">entries</span>
            <span class="readout-value">{{ totalEntries }}</span>
          </div>
          <div class="readout-row">
            <span class="readout-label">latest</span>
            <span class="readout-value readout-value--accent">{{ latestDate }}</span>
          </div>
        </div>
      </section>

      <section class="feature-strip" data-blog-panel aria-label="精选文章">
        <GlassCard title="精选" code="00" tag="Featured Signal">
          <RouterLink
            v-if="featuredEntry"
            class="featured-link"
            :to="`/blog/post/${featuredEntry.id}`"
            :aria-label="`阅读：${featuredEntry.title}`"
          >
            <span class="featured-kicker">{{ featuredEntry.date }}</span>
            <span class="featured-title iridescent iridescent--soft">{{ featuredEntry.title }}</span>
            <span class="featured-excerpt">{{ featuredEntry.excerpt }}</span>
          </RouterLink>
          <template #footer>
            <div class="signal-meter" aria-hidden="true">
              <span /><span /><span /><span /><span />
            </div>
          </template>
        </GlassCard>
      </section>

      <section v-if="allTags.length" class="tags-strip" data-blog-panel aria-label="标签">
        <GlassCard title="标签" code="02" tag="Taxonomy">
          <TagList :tags="allTags" />
        </GlassCard>
      </section>

      <section id="reflections" class="entry-section reflections-section" data-blog-panel>
        <GlassCard title="有感" code="01" tag="Reflection Stream">
          <ul class="entry-list">
            <li v-for="(entry, index) in entries" :key="entry.id" class="entry-item">
              <RouterLink
                class="entry-link"
                :to="`/blog/post/${entry.id}`"
                :aria-label="`阅读：${entry.title}`"
              >
                <span class="entry-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="entry-content">
                  <span class="entry-meta">
                    <time class="entry-date">{{ entry.date }}</time>
                    <span class="entry-id">{{ entry.id }}</span>
                    <span class="entry-reading">{{ entry.readingMinutes }} min</span>
                  </span>
                  <span class="entry-title">{{ entry.title }}</span>
                  <span class="entry-excerpt">{{ entry.excerpt }}</span>
                  <TagList :tags="entry.tags" />
                </span>
              </RouterLink>
            </li>
          </ul>
          <template #footer>
            <span class="entry-count">{{ entries.length }} entries</span>
            <a class="rss-link" href="/api/rss" target="_blank" rel="noopener">RSS ↗</a>
          </template>
        </GlassCard>
      </section>
    </div>
  </main>
</template>

<style scoped>
.blog-layout {
  position: relative;
  min-height: calc(100dvh - var(--nav-height));
  overflow: hidden;
}

.blog-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
  grid-template-areas:
    'hero feature'
    'tags tags'
    'reflections reflections';
  gap: 1rem;
  max-width: var(--content-max);
  min-height: calc(100dvh - var(--nav-height));
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.hero-panel {
  grid-area: hero;
  position: relative;
  display: grid;
  align-content: space-between;
  min-height: 24rem;
  padding: clamp(1.5rem, 4vw, 3rem);
  overflow: hidden;
}

.hero-copy,
.hero-readout {
  position: relative;
  z-index: 1;
}

.eyebrow {
  display: block;
  margin: 0 0 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.hero-title {
  max-width: 12em;
  margin: 0;
  font-size: clamp(2.25rem, 6vw, 5.25rem);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.95);
}

.hero-text {
  max-width: 38rem;
  margin: 1.5rem 0 0;
  font-family: var(--font-mono);
  font-size: clamp(0.8125rem, 1.6vw, 0.9375rem);
  font-weight: 300;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.58);
}

.hero-readout {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 2.5rem;
}

.readout-row {
  min-width: 0;
  padding: 0.85rem 0.9rem;
  border-left: 1px solid rgba(158, 216, 255, 0.35);
  background: rgba(0, 0, 0, 0.22);
}

.readout-label,
.readout-value {
  display: block;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.readout-label {
  margin-bottom: 0.35rem;
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.38);
}

.readout-value {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.88);
}

.readout-value--accent {
  color: #f0abfc;
}

.feature-strip {
  grid-area: feature;
  min-width: 0;
}

.tags-strip {
  grid-area: tags;
}

.feature-strip :deep(.glass-card),
.tags-strip :deep(.glass-card) {
  height: 100%;
}

.featured-link {
  display: grid;
  gap: 1rem;
  width: 100%;
  min-height: 17rem;
  padding: 1.5rem;
  color: inherit;
  text-align: left;
  text-decoration: none;
  background:
    linear-gradient(150deg, rgba(124, 140, 255, 0.12), transparent 42%),
    transparent;
  border: 0;
  cursor: pointer;
}

.featured-link:hover .featured-title,
.entry-link:hover .entry-title {
  filter: brightness(1.15) saturate(1.12);
}

.featured-kicker {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: #9ed8ff;
}

.featured-title {
  display: block;
  max-width: 9em;
  font-size: clamp(1.75rem, 3vw, 2.8rem);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.02em;
  transition: filter 0.35s var(--ease-mechanical);
}

.featured-excerpt {
  align-self: end;
  max-width: 30rem;
  font-size: var(--text-base);
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.55);
}

.signal-meter {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.signal-meter span {
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.signal-meter span:nth-child(2),
.signal-meter span:nth-child(4) {
  background: rgba(158, 216, 255, 0.65);
}

.reflections-section {
  grid-area: reflections;
}

.entry-section {
  min-width: 0;
}

.entry-section :deep(.glass-card) {
  height: 100%;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entry-item + .entry-item {
  border-top: 1px solid rgba(255, 255, 255, 0.055);
}

.entry-link {
  display: grid;
  grid-template-columns: 3.2rem minmax(0, 1fr);
  gap: 1rem;
  width: 100%;
  padding: 1.15rem 1.5rem 1.25rem;
  color: inherit;
  text-align: left;
  text-decoration: none;
  background: transparent;
  transition:
    background 0.35s var(--ease-mechanical),
    transform 0.35s var(--ease-mechanical);
}

.entry-link:hover {
  background: rgba(255, 255, 255, 0.04);
  transform: translateX(2px);
}

.entry-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.24);
}

.entry-content,
.entry-meta,
.entry-title,
.entry-excerpt {
  display: block;
  min-width: 0;
}

.entry-meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.45rem;
}

.entry-date,
.entry-id,
.entry-reading {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
}

.entry-id {
  color: rgba(255, 255, 255, 0.2);
}

.entry-title {
  margin-bottom: 0.4rem;
  font-size: var(--text-lg);
  line-height: 1.35;
  font-weight: 750;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.92);
  transition: filter 0.35s var(--ease-mechanical);
}

.entry-excerpt {
  margin-bottom: 0.5rem;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.52);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: var(--tracking-wide);
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
}

.rss-link {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: #9ed8ff;
  text-decoration: none;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.status-dot.synced {
  background: #9ed8ff;
  box-shadow: 0 0 10px rgba(158, 216, 255, 0.45);
}

.status-dot.loading {
  background: #c084fc;
  animation: pulse 1.2s ease-in-out infinite;
}

.status-dot.local {
  background: var(--color-muted);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 960px) {
  .blog-shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      'hero'
      'feature'
      'tags'
      'reflections';
  }

  .hero-panel {
    min-height: 22rem;
  }
}

@media (max-width: 620px) {
  .blog-shell {
    padding: 1rem 0.85rem 2rem;
  }

  .hero-panel {
    padding: 1.35rem;
  }

  .hero-readout {
    grid-template-columns: 1fr;
    margin-top: 2rem;
  }

  .featured-link {
    min-height: 14rem;
    padding: 1.25rem;
  }

  .entry-link {
    grid-template-columns: 2.35rem minmax(0, 1fr);
    padding: 1rem 1.15rem;
  }

  .entry-meta {
    display: grid;
    gap: 0.25rem;
  }
}
</style>
