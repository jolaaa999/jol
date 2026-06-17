<script setup lang="ts">
defineProps<{
  /** 卡片标题 */
  title: string
  /** 区块编号，如 01 */
  code?: string
  /** 副标题 / 分类标签 */
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
  background: var(--glass-endfield-bg);
  backdrop-filter: blur(var(--glass-endfield-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-endfield-blur)) saturate(150%);
  border: 1px solid var(--glass-endfield-border);
  border-radius: 2px;
  box-shadow: var(--glass-endfield-shadow);
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
  color: var(--color-accent-cyan);
  opacity: 0.85;
}

.glass-card__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--color-foreground);
}

.glass-card__tag {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 400;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--color-muted);
  white-space: nowrap;
}

.glass-card__body {
  flex: 1;
  padding: 0.5rem 0;
}

.glass-card__footer {
  padding: 0.75rem 1.5rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
</style>
