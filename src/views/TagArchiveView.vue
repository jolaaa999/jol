<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useBlogEntries } from '@/composables/useBlogEntries'
import { SITE } from '@/data/site'
import TagList from '@/components/blog/TagList.vue'

const route = useRoute()
const { getByTag, fetchEntries } = useBlogEntries()

const tag = computed(() => decodeURIComponent(route.params.tag as string))
const entries = computed(() => getByTag(tag.value))

const pageTitle = computed(() => `Tag: ${tag.value} · ${SITE.name}`)

useHead({
  title: pageTitle,
  meta: [
    {
      name: 'description',
      content: computed(() => `Articles tagged with ${tag.value}`),
    },
  ],
})

onMounted(() => fetchEntries())
</script>

<template>
  <main class="tag-archive">
    <header class="tag-archive__header glass-fluid">
      <RouterLink class="tag-archive__back" to="/blog">← 返回博客</RouterLink>
      <p class="tag-archive__eyebrow">Archive</p>
      <h1 class="tag-archive__title">#{{ tag }}</h1>
      <p class="tag-archive__count">{{ entries.length }} entries</p>
    </header>

    <ul class="tag-archive__list">
      <li v-for="entry in entries" :key="entry.id" class="tag-archive__item glass-fluid">
        <RouterLink class="tag-archive__link" :to="`/blog/post/${entry.id}`">
          <time class="tag-archive__date">{{ entry.date }}</time>
          <span class="tag-archive__entry-title">{{ entry.title }}</span>
          <span class="tag-archive__excerpt">{{ entry.excerpt }}</span>
          <TagList :tags="entry.tags" />
        </RouterLink>
      </li>
    </ul>

    <p v-if="!entries.length" class="tag-archive__empty">该标签下暂无文章。</p>
  </main>
</template>

<style scoped>
.tag-archive {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 2.75rem) 3rem;
}

.tag-archive__header {
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.tag-archive__back {
  display: inline-block;
  margin-bottom: 1rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  text-decoration: none;
}

.tag-archive__eyebrow {
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.tag-archive__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.tag-archive__count {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.tag-archive__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tag-archive__link {
  display: grid;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: background 0.3s;
}

.tag-archive__link:hover {
  background: rgba(255, 255, 255, 0.03);
}

.tag-archive__date {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.35);
}

.tag-archive__entry-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.tag-archive__excerpt {
  font-size: 0.8125rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.52);
}

.tag-archive__empty {
  padding: 2rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}
</style>
