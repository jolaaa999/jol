<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'
import type { WorkProject } from '@/types/work'
import ArchivePreview from '@/components/works/archive/ArchivePreview.vue'

const props = defineProps<{
  work: WorkProject
  index: number
}>()

const hovered = ref(false)
const copyRef = ref<HTMLElement | null>(null)
const visualRef = ref<HTMLElement | null>(null)
const labelRef = ref<HTMLElement | null>(null)

const displayedWork = ref(props.work)
const displayedIndex = ref(props.index)

let animating = false

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pad(n: number): string {
  return String(n + 1).padStart(2, '0')
}

function formatDate(iso: string): string {
  return iso.replace(/-/g, '.')
}

function tagline(desc: string): string {
  const clean = desc.trim()
  if (clean.length <= 48) return clean.toUpperCase()
  return `${clean.slice(0, 48).trim()}…`
}

function syncDisplayed(): void {
  displayedWork.value = props.work
  displayedIndex.value = props.index
}

async function animateSwap(): Promise<void> {
  const targets = [labelRef.value, copyRef.value, visualRef.value].filter(Boolean)
  if (!targets.length) {
    syncDisplayed()
    return
  }

  if (prefersReducedMotion()) {
    syncDisplayed()
    return
  }

  animating = true

  await gsap.to(targets, {
    x: 56,
    opacity: 0,
    duration: 0.38,
    ease: 'power2.in',
    stagger: 0.04,
  })

  syncDisplayed()
  hovered.value = false
  await nextTick()

  gsap.set(targets, { x: -56, opacity: 0 })

  await gsap.to(targets, {
    x: 0,
    opacity: 1,
    duration: 0.48,
    ease: 'power3.out',
    stagger: 0.05,
    clearProps: 'transform',
  })

  animating = false
}

watch(
  () => props.work.id,
  (newId, oldId) => {
    if (newId === oldId || animating) return
    void animateSwap()
  },
)

onMounted(() => {
  syncDisplayed()
})
</script>

<template>
  <article
    id="archive-featured"
    class="archive-featured"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <div ref="labelRef" class="archive-featured__head">
      <p class="archive-featured__label">
        <span>Featured</span>
        <span class="archive-featured__label-sep">/</span>
        <span>{{ pad(displayedIndex) }}</span>
      </p>
    </div>

    <div class="archive-featured__grid">
      <div ref="copyRef" class="archive-featured__copy">
        <h3 class="archive-featured__title">{{ displayedWork.name }}</h3>
        <p class="archive-featured__tagline">{{ tagline(displayedWork.description) }}</p>
        <p class="archive-featured__desc">{{ displayedWork.description }}</p>

        <div class="archive-featured__meta">
          <span>{{ displayedWork.language }}</span>
          <span>{{ formatDate(displayedWork.updatedAt) }}</span>
          <span v-if="displayedWork.stars > 0">★ {{ displayedWork.stars }}</span>
        </div>

        <div class="archive-featured__actions" :class="{ 'is-visible': hovered }">
          <a
            class="archive-featured__link"
            :href="displayedWork.repoUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >
            Repository ↗
          </a>
          <a
            v-if="displayedWork.demoUrl"
            class="archive-featured__link"
            :href="displayedWork.demoUrl"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >
            Live Demo →
          </a>
        </div>

        <a
          class="archive-featured__cta"
          :href="displayedWork.demoUrl ?? displayedWork.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          View Project ↗
        </a>
      </div>

      <div ref="visualRef" class="archive-featured__visual">
        <ArchivePreview :key="displayedWork.id" :work="displayedWork" size="lg" />
      </div>
    </div>

    <div class="archive-featured__rule" aria-hidden="true" />
  </article>
</template>

<style scoped>
.archive-featured {
  margin-bottom: clamp(4rem, 10vh, 7rem);
}

.archive-featured__head {
  margin-bottom: clamp(1.5rem, 4vh, 2.5rem);
  overflow: hidden;
}

.archive-featured__label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-featured__label-sep {
  opacity: 0.4;
}

.archive-featured__grid {
  display: grid;
  grid-template-columns: repeat(var(--arch-grid-cols), minmax(0, 1fr));
  gap: clamp(2rem, 5vw, 4rem) 1.25rem;
  align-items: start;
}

.archive-featured__copy {
  grid-column: 1 / 7;
  overflow: hidden;
}

.archive-featured__visual {
  grid-column: 7 / -1;
  align-self: stretch;
  overflow: hidden;
}

.archive-featured__title {
  margin: 0 0 0.75rem;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--arch-fg);
  transition: transform 0.4s var(--arch-ease);
}

.archive-featured:hover .archive-featured__title {
  transform: translateX(6px);
}

.archive-featured__tagline {
  margin: 0 0 1.25rem;
  font-family: var(--font-mono);
  font-size: clamp(0.75rem, 1.4vw, 0.875rem);
  font-weight: 400;
  letter-spacing: 0.14em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--arch-meta-active);
}

.archive-featured__desc {
  margin: 0 0 2rem;
  max-width: 36rem;
  font-size: clamp(0.9375rem, 1.5vw, 1.0625rem);
  font-weight: 300;
  line-height: 1.75;
  color: var(--arch-fg-muted);
}

.archive-featured__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-featured__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-bottom: 1rem;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
  pointer-events: none;
}

.archive-featured__actions.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.archive-featured__link {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--arch-meta-active);
  transition: color 0.3s var(--arch-ease);
}

.archive-featured__link:hover {
  color: var(--arch-fg);
}

.archive-featured__cta {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--arch-fg-muted);
  transition:
    color 0.35s var(--arch-ease),
    transform 0.35s var(--arch-ease);
}

.archive-featured__cta:hover {
  color: var(--arch-accent);
  transform: translateX(4px);
}

.archive-featured__rule {
  height: 1px;
  margin-top: clamp(3rem, 6vh, 4.5rem);
  background: var(--arch-border);
}

@media (max-width: 960px) {
  .archive-featured__copy {
    grid-column: 1 / 5;
  }

  .archive-featured__visual {
    grid-column: 5 / -1;
  }
}

@media (max-width: 620px) {
  .archive-featured__grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .archive-featured__copy,
  .archive-featured__visual {
    grid-column: 1 / -1;
  }

  .archive-featured__actions {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
}
</style>
