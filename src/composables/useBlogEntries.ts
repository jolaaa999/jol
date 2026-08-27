import { computed, ref } from 'vue'
import type { ArticleApiItem, ArticleListResponse, BlogEntry } from '@/types/blog'
import { estimateReadingMinutes } from '@/utils/readingTime'

const FALLBACK_ENTRIES: BlogEntry[] = [
  {
    id: 'r-001',
    title: '关于克制',
    excerpt: '好的界面像好的诗。每一个元素都有存在的理由，其余皆是噪声。',
    content:
      '## 噪声与信号\n\n好的界面像好的诗——每个元素都有存在的理由，其余皆是噪声。\n\n## 留白的价值\n\n暗色背景不是空虚，是留给内容的负空间。',
    date: '2026-06-01',
    tags: ['design', 'philosophy'],
    readingMinutes: 2,
  },
  {
    id: 'r-002',
    title: '物理与感知',
    excerpt: 'Verlet 积分教会我，平滑的动画不是插值出来的，而是被力推导出来的。',
    content:
      '## 力的推导\n\nVerlet 积分教会我：平滑的动画不是插值出来的，而是被力推导出来的。\n\n```typescript\nvelocity += force * dt\nposition += velocity * dt\n```\n\n## 感知连续性\n\n人眼对加速度变化更敏感。',
    date: '2026-05-20',
    tags: ['animation', 'physics', 'typescript'],
    readingMinutes: 3,
  },
  {
    id: 'r-003',
    title: '终末地的灰',
    excerpt: '暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。',
    content:
      '## 工业灰\n\n暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。\n\n## 毛玻璃层次\n\nbackdrop-filter 与细边框叠加，构成可读的玻璃层次。',
    date: '2026-05-08',
    tags: ['design', 'ui'],
    readingMinutes: 2,
  },
]

function toEntry(article: ArticleApiItem): BlogEntry {
  const content = article.content
  return {
    id: article.id,
    title: article.title,
    excerpt: content.replace(/\n/g, ' ').replace(/#+\s/g, '').slice(0, 96),
    content,
    date: article.created_at.slice(0, 10),
    tags: article.tags ?? [],
    readingMinutes: estimateReadingMinutes(content),
  }
}

const entries = ref<BlogEntry[]>([...FALLBACK_ENTRIES])
const status = ref<'loading' | 'synced' | 'local'>('loading')
let fetchPromise: Promise<void> | null = null

async function fetchEntries(): Promise<void> {
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) throw new Error('offline')
      const data = (await res.json()) as ArticleListResponse
      if (data.data?.length) {
        entries.value = data.data.map(toEntry)
        status.value = 'synced'
      } else {
        status.value = 'local'
      }
    } catch {
      status.value = 'local'
    }
  })()

  return fetchPromise
}

export function useBlogEntries() {
  const allTags = computed(() => {
    const set = new Set<string>()
    for (const e of entries.value) {
      for (const t of e.tags) set.add(t)
    }
    return [...set].sort()
  })

  function getById(id: string): BlogEntry | undefined {
    return entries.value.find((e) => e.id === id)
  }

  function getByTag(tag: string): BlogEntry[] {
    const normalized = tag.toLowerCase()
    return entries.value.filter((e) =>
      e.tags.some((t) => t.toLowerCase() === normalized),
    )
  }

  function search(query: string): BlogEntry[] {
    const q = query.trim().toLowerCase()
    if (!q) return entries.value
    return entries.value.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.excerpt.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }

  return {
    entries,
    status,
    allTags,
    fetchEntries,
    getById,
    getByTag,
    search,
  }
}
