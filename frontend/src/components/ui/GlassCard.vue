<script setup lang="ts">
/** 毛玻璃卡片组件属性定义 */
defineProps<{
  title: string
  code?: string
  tag?: string
}>()
</script>

<template>
  <article class="glass-card">
    <header class="glass-card__header">
      <div class="glass-card__title-group">
        <span v-if="code" class="glass-card__code">{{ code }}</span>
        <h2 class="glass-card__title">{{ title }}</h2>
      </div>
      <span v-if="tag" class="glass-card__tag">{{ tag }}</span>
      <slot name="header-extra" />
    </header>

    <div v-if="$slots.default" class="glass-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="glass-card__footer">
      <slot name="footer" />
    </footer>
  </article>
</template>

<style scoped>
.glass-card {
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 16, 0.38);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.glass-card__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.glass-card__title-group {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.glass-card__code {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 400;
  letter-spacing: var(--tracking-wide);
  color: #9ed8ff;
  opacity: 0.85;
}

.glass-card__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.92);
}

.glass-card__tag {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
  white-space: nowrap;
}

.glass-card__body {
  flex: 1;
  padding: 0.5rem 0;
}

.glass-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
</style>
