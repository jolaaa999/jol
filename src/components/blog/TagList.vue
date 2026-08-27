<script setup lang="ts">
import { RouterLink } from 'vue-router'

defineProps<{
  tags: string[]
}>()
</script>

<template>
  <ul v-if="tags.length" class="tag-list">
    <li v-for="tag in tags" :key="tag" class="tag-list__item">
      <RouterLink class="tag-list__link" :to="`/blog/tag/${encodeURIComponent(tag)}`">
        #{{ tag }}
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-list__link {
  display: inline-block;
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.55);
  transition:
    color 0.25s var(--ease-mechanical),
    border-color 0.25s var(--ease-mechanical);
}

.tag-list__link:hover {
  color: #9ed8ff;
  border-color: rgba(158, 216, 255, 0.4);
}
</style>
