<script setup lang="ts">
import { EXPERIENCE } from '@/data/site'
</script>

<template>
  <ol class="timeline">
    <li v-for="item in EXPERIENCE" :key="item.id" class="timeline__item">
      <div class="timeline__marker" aria-hidden="true" />
      <div class="timeline__content">
        <time class="timeline__period">{{ item.period }}</time>
        <h3 class="timeline__role">{{ item.role }}</h3>
        <p class="timeline__org">{{ item.org }}</p>
        <p class="timeline__desc">{{ item.description }}</p>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline__item {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr);
  gap: 1rem;
  padding-bottom: 1.75rem;
}

.timeline__item:last-child {
  padding-bottom: 0;
}

.timeline__marker {
  position: relative;
  width: 7px;
  height: 7px;
  margin-top: 0.35rem;
  border-radius: 50%;
  background: #9ed8ff;
  box-shadow: 0 0 10px rgba(158, 216, 255, 0.5);
}

.timeline__item:not(:last-child) .timeline__marker::after {
  content: '';
  position: absolute;
  top: 10px;
  left: 3px;
  width: 1px;
  height: calc(100% + 1.5rem);
  background: var(--fluid-border);
}

.timeline__period {
  display: block;
  margin-bottom: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fluid-fg-dim);
}

.timeline__role {
  margin: 0 0 0.2rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--fluid-fg);
}

.timeline__org {
  margin: 0 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: #c084fc;
}

.timeline__desc {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--fluid-fg-muted);
}
</style>
