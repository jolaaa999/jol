<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import ReadingProgress from '@/components/blog/ReadingProgress.vue'
import ArticleToc from '@/components/blog/ArticleToc.vue'
import TagList from '@/components/blog/TagList.vue'
import GiscusComments from '@/components/blog/GiscusComments.vue'
import NewsletterSignup from '@/components/blog/NewsletterSignup.vue'
import { useBlogEntries } from '@/composables/useBlogEntries'
import { SITE } from '@/data/site'
import { extractToc, injectHeadingIds, renderArticleHtml } from '@/utils/articleContent'

const route = useRoute()
const router = useRouter()
const { getById, fetchEntries } = useBlogEntries()

const entry = ref(getById(route.params.id as string))

const toc = computed(() => (entry.value ? extractToc(entry.value.content) : []))
const html = computed(() => {
  if (!entry.value) return ''
  const raw = renderArticleHtml(entry.value.content)
  return injectHeadingIds(raw, toc.value)
})

const pageTitle = computed(() =>
  entry.value ? `${entry.value.title} · ${SITE.name}` : SITE.title,
)
const pageDescription = computed(() => entry.value?.excerpt ?? SITE.description)
const pageUrl = computed(() =>
  entry.value ? `${SITE.url}/blog/post/${entry.value.id}` : SITE.url,
)

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
    { property: 'og:url', content: pageUrl },
    { property: 'og:type', content: 'article' },
  ],
  link: [{ rel: 'canonical', href: pageUrl }],
})

onMounted(async () => {
  await fetchEntries()
  entry.value = getById(route.params.id as string)
  if (!entry.value) {
    router.replace('/blog')
  }
})

watch(
  () => route.params.id,
  async (id) => {
    await fetchEntries()
    entry.value = getById(id as string)
    if (!entry.value) router.replace('/blog')
  },
)

function share(): void {
  if (!entry.value) return
  const url = `${SITE.url}/blog/post/${entry.value.id}`
  if (navigator.share) {
    navigator.share({ title: entry.value.title, url }).catch(() => {})
  } else {
    navigator.clipboard?.writeText(url)
  }
}
</script>

<template>
  <article v-if="entry" class="article-view">
    <ReadingProgress />

    <div class="article-view__inner">
      <header class="article-view__header glass-fluid">
        <RouterLink class="article-view__back" to="/blog">← 返回列表</RouterLink>
        <time class="article-view__date">{{ entry.date }}</time>
        <h1 class="article-view__title iridescent iridescent--soft">{{ entry.title }}</h1>
        <div class="article-view__meta">
          <span class="article-view__reading">{{ entry.readingMinutes }} min read</span>
          <button type="button" class="article-view__share" @click="share">分享</button>
        </div>
        <TagList :tags="entry.tags" />
      </header>

      <div class="article-view__layout">
        <aside v-if="toc.length" class="article-view__aside">
          <ArticleToc :items="toc" />
        </aside>

        <div class="article-view__body glass-fluid">
          <div class="article-content" v-html="html" />
          <NewsletterSignup />
          <GiscusComments />
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.article-view {
  position: relative;
  min-height: calc(100dvh - var(--nav-height));
  padding-bottom: 3rem;
}

.article-view__inner {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 2.75rem);
}

.article-view__header {
  padding: 1.5rem clamp(1.25rem, 3vw, 2rem);
  margin-bottom: 1rem;
}

.article-view__back {
  display: inline-block;
  margin-bottom: 1rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  transition: color 0.25s;
}

.article-view__back:hover {
  color: #9ed8ff;
}

.article-view__date {
  display: block;
  margin-bottom: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.article-view__title {
  margin: 0 0 1rem;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  line-height: 1.12;
  font-weight: 800;
}

.article-view__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.article-view__reading {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.article-view__share {
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
}

.article-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.article-view__body {
  padding: clamp(1.25rem, 3vw, 2rem);
  min-width: 0;
}

:deep(.article-content) {
  font-size: 0.9375rem;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.72);
}

:deep(.article-content h2) {
  margin: 2rem 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

:deep(.article-content h3) {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

:deep(.article-content p) {
  margin: 0 0 1rem;
}

:deep(.article-code) {
  margin: 1rem 0;
  padding: 1rem;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .article-view__layout {
    grid-template-columns: 1fr;
  }

  .article-view__aside {
    order: 2;
  }
}
</style>
