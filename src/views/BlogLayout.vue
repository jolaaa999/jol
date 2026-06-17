<script setup lang="ts">
import { onMounted, ref } from 'vue'
import GlassCard from '@/components/ui/GlassCard.vue'

export interface BlogEntry {
  id: string
  title: string
  excerpt: string
  date: string
}

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

const reflectionEntries = ref<BlogEntry[]>([
  {
    id: 'r-001',
    title: '关于克制',
    excerpt: '好的界面像好的诗——每个元素都有存在的理由，其余皆是噪声。',
    date: '2026-06-01',
  },
  {
    id: 'r-002',
    title: '物理与感知',
    excerpt: 'Verlet 积分教会我：平滑的动画不是插值出来的，而是被力推导出来的。',
    date: '2026-05-20',
  },
  {
    id: 'r-003',
    title: '终末地的灰',
    excerpt: '暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。',
    date: '2026-05-08',
  },
])

const streamStatus = ref<'loading' | 'ready' | 'offline'>('loading')

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

function toEntry(article: ArticleResponse['data'][number]): BlogEntry {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.content.replace(/\n/g, ' ').slice(0, 80),
    date: article.created_at.slice(0, 10),
  }
}

onMounted(async () => {
  try {
    const [poetryRes, postsRes] = await Promise.all([
      fetch('/api/poetry'),
      fetch('/api/posts'),
    ])
    if (!poetryRes.ok || !postsRes.ok) throw new Error('offline')

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
  <div class="blog-layout">
    <div class="topology-bg" aria-hidden="true">
      <svg class="topology-svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="rgba(255,255,255,0.025)"
              stroke-width="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="20%" cy="25%" r="280" fill="rgba(0,212,170,0.03)" />
        <circle cx="85%" cy="70%" r="200" fill="rgba(255,107,44,0.025)" />
        <path
          d="M0,400 Q360,320 720,380 T1440,340"
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          stroke-width="1"
        />
        <path
          d="M0,600 Q480,520 960,560 T1440,500"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          stroke-width="0.75"
        />
      </svg>
    </div>

    <div class="blog-grid">
      <!-- 页眉 -->
      <header class="grid-header">
        <GlassCard title="数据流面板" code="SYS" tag="Endfield / Panel">
          <div class="panel-intro">
            <p class="intro-lead">
              记录<span class="intro-accent">诗文</span>与<span class="intro-accent-alt">有感</span>
            </p>
            <p class="intro-body">
              非对称网格布局 · 毛玻璃数据卡片 · 工业级排版克制
            </p>
          </div>
          <template #footer>
            <div class="status-bar">
              <span class="status-dot" :class="streamStatus" />
              <span class="status-text">
                {{ streamStatus === 'ready' ? 'stream synced' : streamStatus === 'loading' ? 'syncing…' : 'local cache' }}
              </span>
            </div>
          </template>
        </GlassCard>
      </header>

      <!-- 诗文 -->
      <section id="poetry" class="grid-poetry">
        <GlassCard title="诗文" code="01" tag="Poetry Stream">
          <ul class="entry-list">
            <li v-for="entry in poetryEntries" :key="entry.id" class="entry-item">
              <button type="button" class="entry-link">
                <div class="entry-meta">
                  <time class="entry-date">{{ entry.date }}</time>
                  <span class="entry-id">{{ entry.id }}</span>
                </div>
                <h3 class="entry-title">{{ entry.title }}</h3>
                <p class="entry-excerpt">{{ entry.excerpt }}</p>
              </button>
            </li>
          </ul>
          <template #footer>
            <span class="entry-count">{{ poetryEntries.length }} entries</span>
          </template>
        </GlassCard>
      </section>

      <!-- 有感 -->
      <section id="reflections" class="grid-reflections">
        <GlassCard title="有感" code="02" tag="Reflection Stream">
          <ul class="entry-list">
            <li v-for="entry in reflectionEntries" :key="entry.id" class="entry-item">
              <button type="button" class="entry-link">
                <div class="entry-meta">
                  <time class="entry-date">{{ entry.date }}</time>
                  <span class="entry-id">{{ entry.id }}</span>
                </div>
                <h3 class="entry-title">{{ entry.title }}</h3>
                <p class="entry-excerpt">{{ entry.excerpt }}</p>
              </button>
            </li>
          </ul>
          <template #footer>
            <span class="entry-count">{{ reflectionEntries.length }} entries</span>
          </template>
        </GlassCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
.blog-layout {
  position: relative;
  min-height: calc(100dvh - var(--nav-height));
  background-color: var(--color-endfield-bg);
}

/* ── 拓扑背景 ── */
.topology-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.topology-svg {
  width: 100%;
  height: 100%;
  opacity: 0.9;
}

/* ── 非对称 Grid ── */
.blog-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 2fr 3fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'header header'
    'poetry reflections';
  gap: 1.25rem;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  min-height: calc(100dvh - var(--nav-height));
}

.grid-header {
  grid-area: header;
}

.grid-poetry {
  grid-area: poetry;
}

.grid-reflections {
  grid-area: reflections;
}

/* ── 页眉内容 ── */
.panel-intro {
  padding: 0.25rem 1.5rem 0.5rem;
}

.intro-lead {
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 3vw, var(--text-xl));
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-foreground);
}

.intro-accent {
  color: var(--color-accent-cyan);
}

.intro-accent-alt {
  color: var(--color-accent);
}

.intro-body {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 300;
  letter-spacing: 0.03em;
  line-height: 1.7;
  color: var(--color-foreground-dim);
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-muted);
}

.status-dot.ready {
  background: var(--color-accent-cyan);
  box-shadow: 0 0 8px var(--color-accent-cyan-dim);
}

.status-dot.loading {
  background: var(--color-accent);
  animation: pulse 1.2s ease-in-out infinite;
}

.status-dot.offline {
  background: var(--color-muted);
}

.status-text {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-muted);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ── 条目列表 ── */
.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entry-item + .entry-item {
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.entry-link {
  display: block;
  width: 100%;
  padding: 1.125rem 1.5rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.35s var(--ease-mechanical);
}

.entry-link:hover {
  background: rgba(255, 255, 255, 0.03);
}

.entry-link:hover .entry-title {
  color: var(--color-accent-cyan);
}

.entry-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.entry-date {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: var(--color-muted);
}

.entry-id {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
}

.entry-title {
  margin: 0 0 0.375rem;
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--color-foreground);
  transition: color 0.35s var(--ease-mechanical);
}

.entry-excerpt {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 300;
  letter-spacing: 0.02em;
  line-height: 1.65;
  color: var(--color-foreground-dim);
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

/* ── 响应式 ── */
@media (max-width: 900px) {
  .blog-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'header'
      'poetry'
      'reflections';
  }
}

@media (max-width: 480px) {
  .blog-grid {
    padding: 1.25rem 1rem 2rem;
    gap: 1rem;
  }

  .entry-link {
    padding: 1rem 1.25rem;
  }
}
</style>
