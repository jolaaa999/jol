<script setup lang="ts">
import { ref } from 'vue'
import type { WorkProject } from '@/types/work'
import ArchivePreview from '@/components/works/archive/ArchivePreview.vue'

defineProps<{
  work: WorkProject
  index: number
}>()

const hovered = ref(false)

function pad(n: number): string {
  return String(n + 1).padStart(2, '0')
}

function formatDate(iso: string): string {
  return iso.replace(/-/g, '.')
}

function tagline(desc: string): string {
  const clean = desc.trim()
  if (clean.length <= 56) return clean
  return `${clean.slice(0, 56).trim()}…`
}
</script>

<template>
  <article
    class="archive-row"
    :id="`work-${work.id}`"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div class="archive-row__inner">
      <p class="archive-row__num">{{ pad(index) }}</p>

      <div class="archive-row__main">
        <h3 class="archive-row__title">{{ work.name }}</h3>
        <p class="archive-row__tagline">{{ tagline(work.description) }}</p>
      </div>

      <div class="archive-row__meta">
        <span>{{ work.language }}</span>
        <span>{{ formatDate(work.updatedAt) }}</span>
        <span v-if="work.stars > 0" class="archive-row__stars">★ {{ work.stars }}</span>
      </div>

      <div class="archive-row__actions">
        <a
          class="archive-row__cta"
          :href="work.demoUrl ?? work.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`查看 ${work.name}`"
        >
          ↗
        </a>

        <div class="archive-row__links" :class="{ 'is-visible': hovered }">
          <a
            :href="work.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
          >Repository ↗</a>
          <a
            v-if="work.demoUrl"
            :href="work.demoUrl"
            target="_blank"
            rel="noopener noreferrer"
          >Live Demo →</a>
        </div>
      </div>

      <div class="archive-row__preview" :class="{ 'is-visible': hovered }">
        <ArchivePreview :work="work" size="sm" />
      </div>
    </div>

    <div class="archive-row__rule" aria-hidden="true" />
  </article>
</template>

<style scoped>
.archive-row {
  position: relative;
}

.archive-row__inner {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr) auto auto;
  grid-template-rows: auto auto;
  gap: 0.35rem 1.5rem;
  align-items: center;
  padding: clamp(1.35rem, 3vh, 2rem) 0;
  transition: transform 0.4s var(--arch-ease);
}

.archive-row:hover .archive-row__inner {
  transform: translateX(6px);
}

.archive-row__num {
  grid-row: 1 / 3;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  color: var(--arch-meta);
  transition:
    color 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
}

.archive-row:hover .archive-row__num {
  color: var(--arch-accent);
  transform: translateX(4px);
}

.archive-row__main {
  grid-column: 2;
  grid-row: 1 / 3;
  min-width: 0;
}

.archive-row__title {
  margin: 0 0 0.35rem;
  font-size: clamp(1.35rem, 3vw, 2rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--arch-fg);
}

.archive-row__tagline {
  margin: 0;
  font-size: clamp(0.8125rem, 1.4vw, 0.9375rem);
  font-weight: 300;
  line-height: 1.6;
  color: var(--arch-fg-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.archive-row__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--arch-meta);
  text-align: right;
}

.archive-row__stars {
  color: var(--arch-meta-active);
}

.archive-row__actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 2.5rem;
}

.archive-row__cta {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  font-size: 1rem;
  text-decoration: none;
  color: var(--arch-fg-muted);
  transition: color 0.35s var(--arch-ease);
}

.archive-row__cta:hover {
  color: var(--arch-accent);
}

.archive-row__links {
  position: absolute;
  right: 0;
  top: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  margin-top: 0.5rem;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    opacity 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
  pointer-events: none;
  white-space: nowrap;
}

.archive-row__links.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.archive-row__links a {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--arch-meta-active);
}

.archive-row__links a:hover {
  color: var(--arch-fg);
}

.archive-row__preview {
  position: absolute;
  right: 0;
  top: 50%;
  width: min(14rem, 28vw);
  opacity: 0;
  transform: translateY(-50%) translateX(12px);
  transition:
    opacity 0.4s var(--arch-ease),
    transform 0.4s var(--arch-ease);
  pointer-events: none;
  z-index: 2;
}

.archive-row__preview.is-visible {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

.archive-row__rule {
  height: 1px;
  background: var(--arch-border);
}

.archive-row:hover .archive-row__rule {
  background: var(--arch-border-accent);
}

@media (max-width: 960px) {
  .archive-row__preview {
    display: none;
  }
}

@media (max-width: 620px) {
  .archive-row__inner {
    grid-template-columns: 2.5rem 1fr;
    grid-template-rows: auto auto auto auto;
    gap: 0.5rem 1rem;
  }

  .archive-row__num {
    grid-row: 1;
  }

  .archive-row__main {
    grid-column: 2;
    grid-row: 1 / 3;
  }

  .archive-row__meta {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: flex-start;
    gap: 1rem;
    text-align: left;
  }

  .archive-row__actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .archive-row__links {
    position: static;
    flex-direction: row;
    gap: 1rem;
    margin-top: 0;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}
</style>
