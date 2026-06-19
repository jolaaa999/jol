<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import GlassCard from '@/components/ui/GlassCard.vue'

/** 博客条目数据结构 */
export interface BlogEntry {
  id: string
  title: string
  excerpt: string
  date: string
}

/** 诗文条目列表（含本地占位数据） */
const poetryEntries = ref<BlogEntry[]>([
  {
    id: 'p-001',
    title: '静夜',
    excerpt: '月色落在窗棂上，像一段未完成的代码，等待被编译成梦。',
    date: '2026-05-12',
  },
  {
    id: 'p-002',
    title: '风过草原',
    excerpt: '蒲公英解体的那一秒，整片草原都在悄悄重写自己的坐标系。',
    date: '2026-04-28',
  },
  {
    id: 'p-003',
    title: '拓扑',
    excerpt: '节点与边构成世界，我们在毛玻璃后面，阅读自己的连接度。',
    date: '2026-03-15',
  },
])

/** 有感/随笔条目列表（含本地占位数据） */
const reflectionEntries = ref<BlogEntry[]>([
  {
    id: 'r-001',
    title: '关于克制',
    excerpt: '好的界面像好的诗。每一个元素都有存在的理由，其余皆是噪声。',
    date: '2026-06-01',
  },
  {
    id: 'r-002',
    title: '物理与感知',
    excerpt: 'Verlet 积分教会我，平滑的动画不是插值出来的，而是被力推导出来的。',
    date: '2026-05-20',
  },
  {
    id: 'r-003',
    title: '终末地的灯',
    excerpt: '暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。',
    date: '2026-05-08',
  },
])

/** 文章流同步状态：加载中 / 已就绪 / 离线 */
const streamStatus = ref<'loading' | 'ready' | 'offline'>('loading')

/** 精选展示条目（优先有感，否则诗文） */
const featuredEntry = computed(() => reflectionEntries.value[0] ?? poetryEntries.value[0])
/** 全部条目数量 */
const totalEntries = computed(() => poetryEntries.value.length + reflectionEntries.value.length)
/** 最新发布日期 */
const latestDate = computed(() => {
  /** 全部条目日期，降序排列后取最新 */
  const dates = [...poetryEntries.value, ...reflectionEntries.value].map((entry) => entry.date).sort().reverse()
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
    date: article.created_at.slice(0, 10),
  }
}

/** 挂载后并行拉取诗文与文章 API，失败则保持离线占位数据 */
onMounted(async () => {
  try {
    /** 并行请求诗文与文章接口 */
    const [poetryRes, postsRes] = await Promise.all([
      fetch('/api/poetry'),
      fetch('/api/posts'),
    ])
    if (!poetryRes.ok || !postsRes.ok) throw new Error('offline')

    /** 解析诗文与文章 JSON 响应 */
    const poetryData = (await poetryRes.json()) as ArticleResponse
    const postsData = (await postsRes.json()) as ArticleResponse

    if (poetryData.data?.length) {
      poetryEntries.value = poetryData.data.map(toEntry)
    }
    if (postsData.data?.length) {
      reflectionEntries.value = postsData.data.map(toEntry)
    }
    streamStatus.value = 'ready'
  } catch {
    streamStatus.value = 'offline'
  }
})
</script>

<template>
  <main class="blog-layout">
    <div class="ambient-grid" aria-hidden="true" />
    <div class="ambient-lines" aria-hidden="true" />

    <div class="blog-shell">
      <section class="hero-panel" aria-labelledby="blog-title">
        <div class="hero-copy">
          <p class="eyebrow industrial-label">Journal Operating Layer</p>
          <h1 id="blog-title" class="hero-title">
            在光和噪声之间，记录一些正在成形的想法。
          </h1>
          <p class="hero-text">
            这里收纳诗文、界面笔记和一些关于感知的短篇。它不追求喧哗，更像一张夜间工作台，留下可被再次点亮的线索。
          </p>
        </div>

        <div class="hero-readout" aria-label="博客状态">
          <div class="readout-row">
            <span class="readout-label">status</span>
            <span class="readout-value">
              <span class="status-dot" :class="streamStatus" />
              {{ streamStatus === 'ready' ? 'synced' : streamStatus === 'loading' ? 'syncing' : 'local' }}
            </span>
          </div>
          <div class="readout-row">
            <span class="readout-label">entries</span>
            <span class="readout-value">{{ totalEntries }}</span>
          </div>
          <div class="readout-row">
            <span class="readout-label">latest</span>
            <span class="readout-value">{{ latestDate }}</span>
          </div>
        </div>
      </section>

      <section class="feature-strip" aria-label="精选文章">
        <GlassCard title="精选" code="00" tag="Featured Signal">
          <button type="button" class="featured-link">
            <span class="featured-kicker industrial-label">{{ featuredEntry?.date }}</span>
            <span class="featured-title">{{ featuredEntry?.title }}</span>
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

      <section id="poetry" class="entry-section poetry-section">
        <GlassCard title="诗文" code="01" tag="Poetry Stream">
          <ul class="entry-list">
            <li v-for="(entry, index) in poetryEntries" :key="entry.id" class="entry-item">
              <button type="button" class="entry-link">
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
            <span class="entry-count">{{ poetryEntries.length }} entries</span>
          </template>
        </GlassCard>
      </section>

      <section id="reflections" class="entry-section reflections-section">
        <GlassCard title="有感" code="02" tag="Reflection Stream">
          <ul class="entry-list">
            <li v-for="(entry, index) in reflectionEntries" :key="entry.id" class="entry-item">
              <button type="button" class="entry-link">
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
  </main>
</template>

<style scoped>
.blog-layout {
  position: relative;
  min-height: calc(100dvh - var(--nav-height));
  overflow: hidden;
  background:
    linear-gradient(115deg, rgba(0, 212, 170, 0.08), transparent 26%),
    linear-gradient(245deg, rgba(255, 107, 44, 0.06), transparent 32%),
    #08090b;
}

.ambient-grid,
.ambient-lines {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ambient-grid {
  opacity: 0.72;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, black 0%, transparent 82%);
}

.ambient-lines {
  opacity: 0.58;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0,
      transparent 56px,
      rgba(255, 255, 255, 0.035) 57px,
      transparent 58px
    );
}

.blog-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 0.95fr);
  grid-template-areas:
    'hero feature'
    'poetry reflections';
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
    linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.42));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 18px 60px rgba(0, 0, 0, 0.34);
  overflow: hidden;
}

.hero-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent, rgba(0, 212, 170, 0.18), transparent),
    linear-gradient(0deg, transparent 72%, rgba(255, 255, 255, 0.06));
  clip-path: polygon(0 78%, 100% 47%, 100% 62%, 0 93%);
  opacity: 0.7;
}

.hero-panel::after {
  content: '';
  position: absolute;
  right: -8rem;
  bottom: -7rem;
  width: 26rem;
  height: 16rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transform: rotate(-18deg);
  background:
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.035) 0,
      rgba(255, 255, 255, 0.035) 1px,
      transparent 1px,
      transparent 18px
    );
}

.hero-copy,
.hero-readout {
  position: relative;
  z-index: 1;
}

.eyebrow {
  margin: 0 0 1.5rem;
  color: var(--color-accent-cyan);
}

.hero-title {
  max-width: 12em;
  margin: 0;
  font-size: clamp(2.25rem, 6vw, 5.25rem);
  line-height: 0.98;
  font-weight: 800;
  letter-spacing: 0;
  color: #f6f6f2;
}

.hero-text {
  max-width: 38rem;
  margin: 1.5rem 0 0;
  font-size: var(--text-base);
  line-height: 1.9;
  color: rgba(232, 232, 234, 0.72);
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
  border-left: 1px solid rgba(0, 212, 170, 0.45);
  background: rgba(0, 0, 0, 0.2);
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
  color: var(--color-muted);
}

.readout-value {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: var(--color-foreground);
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
    linear-gradient(150deg, rgba(0, 212, 170, 0.11), transparent 42%),
    transparent;
  border: 0;
  cursor: pointer;
}

.featured-link:hover .featured-title,
.entry-link:hover .entry-title {
  color: var(--color-accent-cyan);
}

.featured-kicker {
  color: var(--color-accent);
}

.featured-title {
  max-width: 9em;
  font-size: clamp(1.75rem, 3vw, 2.8rem);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: 0;
  transition: color 0.35s var(--ease-mechanical);
}

.featured-excerpt {
  align-self: end;
  max-width: 30rem;
  font-size: var(--text-base);
  line-height: 1.8;
  color: var(--color-foreground-dim);
}

.signal-meter {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.4rem;
}

.signal-meter span {
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
}

.signal-meter span:nth-child(2),
.signal-meter span:nth-child(4) {
  background: rgba(0, 212, 170, 0.72);
}

.poetry-section {
  grid-area: poetry;
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
  background: rgba(255, 255, 255, 0.035);
  transform: translateX(2px);
}

.entry-index {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.26);
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
  color: var(--color-muted);
  text-transform: uppercase;
}

.entry-id {
  color: rgba(255, 255, 255, 0.24);
}

.entry-title {
  margin-bottom: 0.4rem;
  font-size: var(--text-lg);
  line-height: 1.35;
  font-weight: 750;
  letter-spacing: 0;
  color: var(--color-foreground);
  transition: color 0.35s var(--ease-mechanical);
}

.entry-excerpt {
  font-size: var(--text-sm);
  line-height: 1.7;
  color: rgba(232, 232, 234, 0.62);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entry-count {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: var(--tracking-wide);
  color: var(--color-muted);
  text-transform: uppercase;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-muted);
}

.status-dot.ready {
  background: var(--color-accent-cyan);
  box-shadow: 0 0 10px var(--color-accent-cyan-dim);
}

.status-dot.loading {
  background: var(--color-accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.status-dot.offline {
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
      'poetry'
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
