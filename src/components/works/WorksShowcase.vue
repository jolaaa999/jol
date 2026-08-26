<script setup lang="ts">
import { nextTick, watch } from 'vue'
import gsap from 'gsap'
import WorkCard from '@/components/works/WorkCard.vue'
import { useGithubWorks } from '@/composables/useGithubWorks'

const { works, status } = useGithubWorks()

function playCardsEntrance(): void {
  const cards = document.querySelectorAll('[data-work-card]')
  if (!cards.length) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    gsap.set(cards, { opacity: 1, y: 0 })
    return
  }

  gsap.fromTo(
    cards,
    { y: 28, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.72,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform',
    },
  )
}

watch(
  works,
  async (list) => {
    if (!list.length) return
    await nextTick()
    playCardsEntrance()
  },
  { flush: 'post' },
)
</script>

<template>
  <section id="works" class="works" aria-labelledby="works-title">
    <div class="works__header" data-work-header>
      <h2 id="works-title" class="works__title">作品档案</h2>
      <p class="works__subtitle">
        从 GitHub 同步的实验与产品 — 界面、工具与一些还在成形中的想法。
      </p>
      <div class="works__status" aria-label="作品同步状态">
        <span class="works__status-dot" :class="status" />
        <span class="works__status-text">
          {{ status === 'synced' ? 'synced from github' : status === 'loading' ? 'syncing…' : 'local cache' }}
        </span>
      </div>
    </div>

    <div v-if="status === 'loading'" class="works__grid works__grid--loading">
      <div v-for="i in 6" :key="i" class="works__skeleton" />
    </div>

    <div v-else class="works__grid">
      <WorkCard
        v-for="(work, index) in works"
        :key="work.id"
        :work="work"
        :index="index"
      />
    </div>

    <footer class="works__footer">
      <a
        class="works__github"
        href="https://github.com/jolaaa999"
        target="_blank"
        rel="noopener noreferrer"
      >
        查看全部仓库
        <span aria-hidden="true">↗</span>
      </a>
    </footer>
  </section>
</template>

<style scoped>
.works {
  position: relative;
  z-index: 5;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: clamp(3rem, 8vh, 5rem) clamp(1.5rem, 4vw, 2.75rem) clamp(4rem, 10vh, 6rem);
}

.works__header {
  margin-bottom: clamp(2rem, 5vh, 3rem);
  max-width: 36rem;
}

.works__title {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.03em;
  color: rgba(255, 255, 255, 0.95);
}

.works__subtitle {
  margin: 0 0 1.25rem;
  font-family: var(--font-mono);
  font-size: clamp(0.8125rem, 1.6vw, 0.9375rem);
  font-weight: 300;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.48);
}

.works__status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
}

.works__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
}

.works__status-dot.synced {
  background: #9ed8ff;
  box-shadow: 0 0 8px rgba(158, 216, 255, 0.5);
}

.works__status-dot.loading {
  background: #c084fc;
  animation: works-pulse 1.2s ease-in-out infinite;
}

.works__status-text {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
}

.works__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.works__grid--loading {
  pointer-events: none;
}

.works__skeleton {
  min-height: 14rem;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.03);
  animation: works-pulse 1.4s ease-in-out infinite;
}

.works__footer {
  margin-top: 2.5rem;
  text-align: center;
}

.works__github {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  transition: color 0.35s var(--ease-mechanical);
}

.works__github:hover {
  color: rgba(255, 255, 255, 0.82);
}

@keyframes works-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

@media (max-width: 960px) {
  .works__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .works {
    padding: 2.5rem 1.25rem 4rem;
  }

  .works__grid {
    grid-template-columns: 1fr;
  }
}
</style>
