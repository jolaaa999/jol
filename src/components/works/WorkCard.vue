<script setup lang="ts">
import type { WorkProject } from '@/types/work'

defineProps<{
  work: WorkProject
  variant?: 'featured' | 'wide' | 'default'
}>()

const LANG_TINT: Record<string, string> = {
  TypeScript: '#9ed8ff',
  JavaScript: '#f0e68c',
  Vue: '#6ee7b7',
  Go: '#5eead4',
  C: '#c4b5fd',
  Python: '#93c5fd',
  HTML: '#fca5a5',
}

function langTint(lang: string): string {
  return LANG_TINT[lang] ?? '#a5b4fc'
}
</script>

<template>
  <article
    class="work-card"
    :class="`work-card--${variant ?? 'default'}`"
    data-work-card
    :style="{ '--work-accent': langTint(work.language) }"
  >
    <div class="work-card__glow" aria-hidden="true" />

    <div class="work-card__body">
      <header class="work-card__head">
        <span class="work-card__lang">{{ work.language }}</span>
        <time class="work-card__date">{{ work.updatedAt }}</time>
      </header>

      <h3 class="work-card__title">{{ work.name }}</h3>
      <p class="work-card__desc">{{ work.description }}</p>

      <footer class="work-card__actions">
        <a
          class="work-card__btn"
          :href="work.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Repository
          <span class="work-card__btn-arrow" aria-hidden="true">↗</span>
        </a>
        <a
          v-if="work.demoUrl"
          class="work-card__btn work-card__btn--live"
          :href="work.demoUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Live demo
          <span class="work-card__btn-arrow" aria-hidden="true">→</span>
        </a>
        <span v-if="work.stars > 0" class="work-card__stars" aria-label="星标数">
          ★ {{ work.stars }}
        </span>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.work-card {
  position: relative;
  min-height: 11.5rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(6, 6, 14, 0.52);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  overflow: hidden;
  transition:
    transform 0.45s var(--ease-mechanical),
    border-color 0.45s var(--ease-mechanical),
    box-shadow 0.45s var(--ease-mechanical);
}

.work-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--work-accent, #a5b4fc);
  opacity: 0.65;
  transition: opacity 0.4s var(--ease-mechanical);
}

.work-card__glow {
  position: absolute;
  top: -40%;
  right: -20%;
  width: 55%;
  height: 80%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--work-accent) 22%, transparent);
  filter: blur(48px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s var(--ease-mechanical);
}

.work-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 64px rgba(0, 0, 0, 0.38);
}

.work-card:hover::before {
  opacity: 1;
}

.work-card:hover .work-card__glow {
  opacity: 0.55;
}

.work-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.35rem 1.4rem 1.3rem;
  height: 100%;
}

.work-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.work-card__lang {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--work-accent, rgba(255, 255, 255, 0.55));
}

.work-card__date {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.28);
}

.work-card__title {
  margin: 0;
  font-size: clamp(1.2rem, 2.2vw, 1.5rem);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.025em;
  color: rgba(255, 255, 255, 0.94);
}

.work-card__desc {
  margin: 0;
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 300;
  line-height: 1.72;
  color: rgba(255, 255, 255, 0.48);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.work-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
}

.work-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.62);
  transition:
    background 0.35s var(--ease-mechanical),
    border-color 0.35s var(--ease-mechanical),
    color 0.35s var(--ease-mechanical);
}

.work-card__btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
}

.work-card__btn--live {
  border-color: color-mix(in srgb, var(--work-accent) 35%, transparent);
  color: color-mix(in srgb, var(--work-accent) 85%, white);
}

.work-card__btn--live:hover {
  border-color: color-mix(in srgb, var(--work-accent) 55%, transparent);
  background: color-mix(in srgb, var(--work-accent) 12%, transparent);
}

.work-card__btn-arrow {
  opacity: 0.7;
  transition: transform 0.35s var(--ease-mechanical);
}

.work-card__btn:hover .work-card__btn-arrow {
  transform: translate(2px, -2px);
}

.work-card__stars {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  color: rgba(240, 171, 252, 0.75);
}

/* ── Featured：首项大卡片 ── */
.work-card--featured {
  min-height: 20rem;
}

.work-card--featured .work-card__body {
  padding: clamp(1.5rem, 3vw, 2.25rem);
  gap: 1.1rem;
}

.work-card--featured .work-card__title {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  max-width: 14em;
}

.work-card--featured .work-card__desc {
  font-size: 0.875rem;
  line-height: 1.85;
  max-width: 36rem;
  -webkit-line-clamp: 4;
}

.work-card--featured .work-card__glow {
  width: 70%;
  height: 100%;
  opacity: 0.25;
}

/* ── Wide：横向舒展 ── */
.work-card--wide .work-card__body {
  padding: 1.5rem 1.6rem;
}

.work-card--wide .work-card__title {
  font-size: clamp(1.35rem, 2.8vw, 1.85rem);
}

@media (max-width: 620px) {
  .work-card--featured {
    min-height: 16rem;
  }

  .work-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .work-card__btn {
    justify-content: center;
  }

  .work-card__stars {
    margin-left: 0;
    text-align: center;
  }
}
</style>
