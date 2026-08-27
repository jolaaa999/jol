<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { resolved, toggle } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="resolved === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
    @click="toggle"
  >
    <span class="theme-toggle__icon" aria-hidden="true">
      {{ resolved === 'dark' ? '☀' : '☾' }}
    </span>
    <span class="theme-toggle__label">{{ resolved === 'dark' ? 'Light' : 'Dark' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.65rem;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-foreground, rgba(255, 255, 255, 0.85));
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color 0.3s var(--ease-mechanical),
    background 0.3s var(--ease-mechanical);
}

.theme-toggle:hover {
  border-color: rgba(158, 216, 255, 0.45);
  background: rgba(255, 255, 255, 0.08);
}

.theme-toggle__icon {
  font-size: 0.75rem;
  line-height: 1;
}
</style>
