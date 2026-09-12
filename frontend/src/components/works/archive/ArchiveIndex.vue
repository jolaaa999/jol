<script setup lang="ts">
import type { WorkProject } from '@/types/work'

defineProps<{
  works: WorkProject[]
  activeId?: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function pad(n: number): string {
  return String(n + 1).padStart(2, '0')
}

function displayName(work: WorkProject): string {
  return work.name.toUpperCase()
}
</script>

<template>
  <nav class="archive-index" aria-label="项目索引">
    <p class="archive-index__label">Index</p>
    <ul class="archive-index__list">
      <li v-for="(work, i) in works" :key="work.id">
        <button
          type="button"
          class="archive-index__item"
          :class="{ 'is-active': activeId === work.id }"
          @click="emit('select', work.id)"
        >
          <span class="archive-index__num">{{ pad(i) }}</span>
          <span class="archive-index__name">{{ displayName(work) }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.archive-index {
  margin-bottom: clamp(4rem, 10vh, 7rem);
}

.archive-index__label {
  margin: 0 0 1.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-index__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.archive-index__item {
  display: inline-flex;
  align-items: baseline;
  gap: 0.65rem;
  padding: 0.35rem 0;
  border: none;
  background: none;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--arch-meta);
  transition:
    color 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
}

.archive-index__item:hover,
.archive-index__item.is-active {
  color: var(--arch-meta-active);
}

.archive-index__item:hover {
  transform: translateX(4px);
}

.archive-index__item:hover .archive-index__num::after,
.archive-index__item.is-active .archive-index__num::after {
  content: ' →';
  color: var(--arch-accent);
}

.archive-index__num {
  color: var(--arch-meta);
  transition: color 0.35s var(--arch-ease);
}

.archive-index__item:hover .archive-index__num,
.archive-index__item.is-active .archive-index__num {
  color: var(--arch-accent);
}

.archive-index__name {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 620px) {
  .archive-index__list {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
