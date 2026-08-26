<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import gsap from 'gsap'
import GlassCard from '@/components/ui/GlassCard.vue'
import { usePageTransition } from '@/composables/usePageTransition'

/** 博客条目数据结构 */
export interface BlogEntry {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
}

/** 有感/随笔条目列表（含本地占位数据） */
const reflectionEntries = ref<BlogEntry[]>([
  {
    id: 'r-001',
    title: '关于克制',
    excerpt: '好的界面像好的诗。每一个元素都有存在的理由，其余皆是噪声。',
    content: '好的界面像好的诗——每个元素都有存在的理由，其余皆是噪声。',
    date: '2026-06-01',
  },
  {
    id: 'r-002',
    title: '物理与感知',
    excerpt: 'Verlet 积分教会我，平滑的动画不是插值出来的，而是被力推导出来的。',
    content: 'Verlet 积分教会我：平滑的动画不是插值出来的，而是被力推导出来的。',
    date: '2026-05-20',
  },
  {
    id: 'r-003',
    title: '终末地的灰',
    excerpt: '暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。',
    content: '暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。',
    date: '2026-05-08',
  },
])

/** 文章流同步状态：加载中 / 已同步 / 本地占位 */
const streamStatus = ref<'loading' | 'synced' | 'local'>('loading')
/** 当前展开阅读的文章 */
const activeEntry = ref<BlogEntry | null>(null)

/** 精选展示条目 */
const featuredEntry = computed(() => reflectionEntries.value[0])
/** 全部条目数量 */
const totalEntries = computed(() => reflectionEntries.value.length)
/** 最新发布日期 */
const latestDate = computed(() => {
  const dates = reflectionEntries.value.map((entry) => entry.date).sort().reverse()
  return dates[0] ?? '--'
})

/** 文章 API 响应体结构 */
interface ArticleResponse {
  data: Array<{
    id: string
    title: string
    category: string
    content: string
    created_at: string
  }>
  total: number
  category: string
}

/** 将 API 文章数据转换为博客条目格式 */
function toEntry(article: ArticleResponse['data'][number]): BlogEntry {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.content.replace(/\n/g, ' ').slice(0, 96),
    content: article.content,
    date: article.created_at.slice(0, 10),
  }
}

/** 展开文章阅读面板 */
function openEntry(entry: BlogEntry): void {
  activeEntry.value = entry
}

/** 关闭文章阅读面板 */
function closeEntry(): void {
  activeEntry.value = null
}

const blogShellRef = ref<HTMLElement | null>(null)
const { consumeFromEntry, endTransition } = usePageTransition()

/** 从入口页进入时播放错落入场 */
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

/** 挂载后并行拉取诗文与文章 API，失败则保持离线占位数据 */
onMounted(async () => {
  if (consumeFromEntry()) {
    playEnterFromEntry()
  }

  try {
    const postsRes = await fetch('/api/posts')
    if (!postsRes.ok) throw new Error('offline')

    const postsData = (await postsRes.json()) as ArticleResponse

    if (postsData.data?.length) {
      reflectionEntries.value = postsData.data.map(toEntry)
      streamStatus.value = 'synced'
    } else {
      streamStatus.value = 'local'
    }
  } catch {
    streamStatus.value = 'local'
  }
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
              <span class="status-dot" :class="streamStatus" />
              {{ streamStatus === 'synced' ? 'synced' : streamStatus === 'loading' ? 'syncing' : 'local' }}
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
          <button
            v-if="featuredEntry"
            type="button"
            class="featured-link"
            :aria-label="`阅读：${featuredEntry.title}`"
            @click="openEntry(featuredEntry)"
          >
            <span class="featured-kicker">{{ featuredEntry?.date }}</span>
            <span class="featured-title iridescent iridescent--soft">{{ featuredEntry?.title }}</span>
            <span class="featured-excerpt">{{ featuredEntry?.excerpt }}</span>
          </button>
          <template #footer>
            <div class="signal-meter" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </template>
        </GlassCard>
      </section>

      <section id="reflections" class="entry-section reflections-section" data-blog-panel>
        <GlassCard title="有感" code="01" tag="Reflection Stream">
          <ul class="entry-list">
            <li v-for="(entry, index) in reflectionEntries" :key="entry.id" class="entry-item">
              <button
                type="button"
                class="entry-link"
                :aria-label="`阅读：${entry.title}`"
                @click="openEntry(entry)"
              >
                <span class="entry-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="entry-content">
                  <span class="entry-meta">
                    <time class="entry-date">{{ entry.date }}</time>
                    <span class="entry-id">{{ entry.id }}</span>
                  </span>
                  <span class="entry-title">{{ entry.title }}</span>
                  <span class="entry-excerpt">{{ entry.excerpt }}</span>
                </span>
              </button>
            </li>
          </ul>
          <template #footer>
            <span class="entry-count">{{ reflectionEntries.length }} entries</span>
          </template>
        </GlassCard>
      </section>
    </div>

    <Teleport to="body">
      <div
        v-if="activeEntry"
        class="entry-reader"
        role="dialog"
        aria-modal="true"
        :aria-label="activeEntry.title"
        @click.self="closeEntry"
        @keydown.escape="closeEntry"
      >
        <article class="entry-reader__panel">
          <header class="entry-reader__header">
            <time class="entry-reader__date">{{ activeEntry.date }}</time>
            <button type="button" class="entry-reader__close" aria-label="关闭" @click="closeEntry">
              ×
            </button>
          </header>
          <h2 class="entry-reader__title">{{ activeEntry.title }}</h2>
          <p class="entry-reader__body">{{ activeEntry.content }}</p>
        </article>
      </div>
    </Teleport>
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

.feature-strip :deep(.glass-card) {
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
  background: transparent;
  border: 0;
  cursor: pointer;
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
.entry-id {
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

.entry-reader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgba(4, 6, 14, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.entry-reader__panel {
  width: min(100%, 36rem);
  max-height: min(80dvh, 32rem);
  overflow-y: auto;
  padding: 1.75rem 1.5rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(8, 8, 16, 0.88);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
}

.entry-reader__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.entry-reader__date {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
}

.entry-reader__close {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.3s var(--ease-mechanical);
}

.entry-reader__close:hover {
  border-color: rgba(158, 216, 255, 0.45);
}

.entry-reader__title {
  margin: 0 0 1.25rem;
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  line-height: 1.15;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.entry-reader__body {
  margin: 0;
  font-size: var(--text-base);
  line-height: 2;
  white-space: pre-line;
  color: rgba(255, 255, 255, 0.68);
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
