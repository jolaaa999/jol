<script setup lang="ts">
defineProps<{
  count: number
  status: 'loading' | 'synced' | 'local'
}>()

const countLabel = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <header class="archive-header" data-archive-header>
    <div class="archive-header__grid">
      <div class="archive-header__copy">
        <p class="archive-header__eyebrow">ARCHIVE</p>
        <h2 id="works-title" class="archive-header__title">作品档案</h2>
        <p class="archive-header__lead">
          从 GitHub 同步的实验与产品。界面、工具，以及一些仍在成形中的想法。
        </p>
      </div>

      <div class="archive-header__aside">
        <p class="archive-header__count">{{ countLabel(count) }}</p>
        <p class="archive-header__count-label">
          <span>Projects</span>
          <span>Indexed</span>
        </p>
        <div class="archive-header__sync" aria-label="作品同步状态">
          <span class="archive-header__sync-dot" :class="status" />
          <span class="archive-header__sync-text">
            {{
              status === 'synced'
                ? 'GitHub Synced'
                : status === 'loading'
                  ? 'Syncing'
                  : 'Local Cache'
            }}
          </span>
        </div>
      </div>
    </div>

    <div class="archive-header__rule" aria-hidden="true" />
  </header>
</template>

<style scoped>
.archive-header {
  margin-bottom: clamp(3rem, 8vh, 5.5rem);
}

.archive-header__grid {
  display: grid;
  grid-template-columns: repeat(var(--arch-grid-cols), minmax(0, 1fr));
  gap: 0 1.25rem;
  align-items: end;
}

.archive-header__copy {
  grid-column: 1 / 9;
}

.archive-header__eyebrow {
  margin: 0 0 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-header__title {
  margin: 0 0 1.25rem;
  font-size: clamp(3rem, 7.5vw, 5.5rem);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: -0.04em;
  color: var(--arch-fg);
}

.archive-header__lead {
  margin: 0;
  max-width: 32rem;
  font-size: clamp(0.9375rem, 1.6vw, 1.0625rem);
  font-weight: 300;
  line-height: 1.75;
  color: var(--arch-fg-muted);
}

.archive-header__aside {
  grid-column: 10 / -1;
  text-align: right;
}

.archive-header__count {
  margin: 0;
  font-size: clamp(4rem, 8vw, 6rem);
  font-weight: 800;
  line-height: 0.9;
  letter-spacing: -0.05em;
  color: var(--arch-fg);
}

.archive-header__count-label {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  margin: 0.5rem 0 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-header__sync {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.archive-header__sync-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--arch-meta);
}

.archive-header__sync-dot.synced {
  background: var(--arch-accent);
}

.archive-header__sync-dot.loading {
  background: var(--arch-accent-violet);
  animation: arch-pulse 1.4s ease-in-out infinite;
}

.archive-header__sync-text {
  font-family: var(--font-mono);
  font-size: 0.5625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--arch-meta);
}

.archive-header__rule {
  height: 1px;
  margin-top: clamp(2.5rem, 5vh, 3.5rem);
  background: var(--arch-border);
}

@keyframes arch-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (max-width: 960px) {
  .archive-header__copy {
    grid-column: 1 / 7;
  }

  .archive-header__aside {
    grid-column: 1 / -1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    text-align: left;
    margin-top: 2rem;
  }

  .archive-header__count-label {
    margin-bottom: 0;
  }
}

@media (max-width: 620px) {
  .archive-header__copy {
    grid-column: 1 / -1;
  }

  .archive-header__aside {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}
</style>
