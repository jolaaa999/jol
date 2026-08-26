<script setup lang="ts">
import type { WorkProject } from '@/types/work'

defineProps<{
  work: WorkProject
  index: number
}>()
</script>

<template>
  <article class="work-card" data-work-card>
    <div class="work-card__head">
      <span class="work-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
      <span v-if="work.language" class="work-card__lang">{{ work.language }}</span>
    </div>

    <h3 class="work-card__title">{{ work.name }}</h3>
    <p class="work-card__desc">{{ work.description }}</p>

    <footer class="work-card__footer">
      <div class="work-card__meta">
        <span v-if="work.stars > 0" class="work-card__stars">★ {{ work.stars }}</span>
        <time class="work-card__date">{{ work.updatedAt }}</time>
      </div>
      <div class="work-card__links">
        <a
          class="work-card__link"
          :href="work.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          repo
          <span aria-hidden="true">↗</span>
        </a>
        <a
          v-if="work.demoUrl"
          class="work-card__link work-card__link--demo"
          :href="work.demoUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          live
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.work-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 14rem;
  padding: 1.35rem 1.4rem 1.25rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  background: rgba(8, 8, 16, 0.42);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 12px 40px rgba(0, 0, 0, 0.22);
  transition:
    transform 0.4s var(--ease-mechanical),
    border-color 0.4s var(--ease-mechanical),
    box-shadow 0.4s var(--ease-mechanical);
}

.work-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 20px 56px rgba(0, 0, 0, 0.32);
}

.work-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.work-card__index {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.28);
}

.work-card__lang {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.04);
}

.work-card__title {
  margin: 0;
  font-size: clamp(1.25rem, 2.5vw, 1.65rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: rgba(255, 255, 255, 0.94);
}

.work-card__desc {
  margin: 0;
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 300;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.52);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.work-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.work-card__meta {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.32);
}

.work-card__stars {
  color: rgba(240, 171, 252, 0.75);
}

.work-card__links {
  display: flex;
  gap: 0.75rem;
}

.work-card__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.48);
  transition: color 0.3s var(--ease-mechanical);
}

.work-card__link:hover {
  color: rgba(255, 255, 255, 0.88);
}

.work-card__link--demo {
  color: rgba(158, 216, 255, 0.72);
}

.work-card__link--demo:hover {
  color: rgba(158, 216, 255, 1);
}
</style>
