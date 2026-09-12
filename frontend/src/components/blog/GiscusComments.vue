<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { SITE } from '@/data/site'
import { useTheme } from '@/composables/useTheme'

const containerRef = ref<HTMLElement | null>(null)
const route = useRoute()
const { resolved } = useTheme()

const giscusTheme = () =>
  resolved.value === 'dark' ? 'dark_dimmed' : 'light'

function loadGiscus(): void {
  if (!containerRef.value) return
  if (!SITE.giscus.repoId || !SITE.giscus.categoryId) {
    containerRef.value.innerHTML =
      '<p class="giscus-fallback">评论系统待配置 — 请在 site.ts 中设置 Giscus repoId 与 categoryId。</p>'
    return
  }

  containerRef.value.innerHTML = ''
  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', SITE.giscus.repo)
  script.setAttribute('data-repo-id', SITE.giscus.repoId)
  script.setAttribute('data-category', SITE.giscus.category)
  script.setAttribute('data-category-id', SITE.giscus.categoryId)
  script.setAttribute('data-mapping', SITE.giscus.mapping)
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', giscusTheme())
  script.setAttribute('data-lang', 'zh-CN')
  script.setAttribute('data-loading', 'lazy')
  script.crossOrigin = 'anonymous'
  script.async = true
  containerRef.value.appendChild(script)
}

onMounted(loadGiscus)
watch(() => route.fullPath, loadGiscus)
watch(resolved, loadGiscus)
</script>

<template>
  <section class="giscus-wrap" aria-label="评论区">
    <p class="giscus-wrap__heading">Comments</p>
    <div ref="containerRef" class="giscus-wrap__embed" />
  </section>
</template>

<style scoped>
.giscus-wrap {
  margin-top: 2.5rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.giscus-wrap__heading {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

:deep(.giscus-fallback) {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}
</style>
