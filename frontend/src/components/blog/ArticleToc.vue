<script setup lang="ts">
import type { TocItem } from '@/utils/articleContent'

defineProps<{
  items: TocItem[]
}>()
</script>

<template>
  <nav v-if="items.length" class="article-toc" aria-label="目录">
    <p class="article-toc__heading">On this page</p>
    <ul class="article-toc__list">
      <li
        v-for="item in items"
        :key="item.id"
        class="article-toc__item"
        :class="{ 'article-toc__item--sub': item.level === 3 }"
      >
        <a class="article-toc__link" :href="`#${item.id}`">{{ item.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.article-toc {
  padding: 1rem 1.1rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.22);
}

.article-toc__heading {
  margin: 0 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.article-toc__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.article-toc__link {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.62);
  text-decoration: none;
  transition: color 0.25s var(--ease-mechanical);
}

.article-toc__link:hover {
  color: #9ed8ff;
}

.article-toc__item--sub .article-toc__link {
  padding-left: 0.75rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
}
</style>
