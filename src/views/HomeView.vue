<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface HealthResponse {
  status: string
  service: string
  version: string
}

const apiStatus = ref<string>('—')

onMounted(async () => {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error('offline')
    const data = (await res.json()) as HealthResponse
    apiStatus.value = data.status
  } catch {
    apiStatus.value = 'offline'
  }
})
</script>

<template>
  <section class="hero">
    <div class="hero-content">
      <p class="industrial-label hero-tag">// system online</p>
      <h1 class="hero-title">
        记录<br />
        <span class="hero-accent">思考</span>与构建
      </h1>
      <p class="hero-desc text-balance">
        个人博客 · 工业极简美学 · 物理驱动的交互体验
      </p>
      <div class="hero-meta glass-panel">
        <div class="meta-item">
          <span class="industrial-label">api</span>
          <span class="meta-value" :class="{ online: apiStatus === 'ok' }">
            {{ apiStatus }}
          </span>
        </div>
        <div class="meta-divider" />
        <div class="meta-item">
          <span class="industrial-label">stack</span>
          <span class="meta-value">vue · go · vercel</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  min-height: calc(100dvh - var(--nav-height));
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 4rem 1.5rem;
}

.hero-content {
  max-width: 36rem;
}

.hero-tag {
  margin-bottom: 1.5rem;
  color: var(--color-accent-cyan);
}

.hero-title {
  margin: 0 0 1.25rem;
  font-size: clamp(2.5rem, 6vw, var(--text-2xl));
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: var(--tracking-tight);
  color: var(--color-foreground);
}

.hero-accent {
  color: var(--color-accent);
}

.hero-desc {
  margin: 0 0 2.5rem;
  font-size: var(--text-base);
  line-height: 1.7;
  color: var(--color-foreground-dim);
}

.hero-meta {
  display: inline-flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.875rem 1.25rem;
  border-radius: 2px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-muted);
  text-transform: lowercase;
}

.meta-value.online {
  color: var(--color-accent-cyan);
}

.meta-divider {
  width: 1px;
  height: 2rem;
  background: var(--color-border-strong);
}
</style>
