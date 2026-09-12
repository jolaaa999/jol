<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkProject } from '@/types/work'

const props = defineProps<{
  work: WorkProject
  size?: 'sm' | 'lg'
}>()

const imageLoaded = ref(false)
const imageFailed = ref(false)

const previewSrc = computed(() => `/works/previews/${props.work.id}.webp`)
const showImage = computed(() => imageLoaded.value && !imageFailed.value)

function resetImageState(): void {
  imageLoaded.value = false
  imageFailed.value = false
}

watch(() => props.work.id, resetImageState)

const LANG_HUE: Record<string, number> = {
  TypeScript: 215,
  JavaScript: 48,
  Vue: 158,
  Go: 172,
  C: 265,
  Python: 210,
  HTML: 0,
}

function langHue(lang: string): number {
  return LANG_HUE[lang] ?? 230
}
</script>

<template>
  <div
    class="archive-preview"
    :class="[`archive-preview--${size ?? 'sm'}`, { 'has-image': showImage }]"
    :style="{ '--preview-hue': langHue(work.language) }"
    aria-hidden="true"
  >
    <img
      class="archive-preview__shot"
      :src="previewSrc"
      :alt="`${work.name} preview`"
      loading="lazy"
      decoding="async"
      @load="imageLoaded = true"
      @error="imageFailed = true"
    />

    <div v-if="!showImage" class="archive-preview__fallback">
      <div class="archive-preview__grid" />
      <div class="archive-preview__scan" />
      <span class="archive-preview__glyph">{{ work.name.slice(0, 2).toUpperCase() }}</span>
    </div>
  </div>
</template>

<style scoped>
.archive-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--arch-border-accent, rgba(120, 140, 255, 0.18));
  background: #06060c;
  border-radius: 2px;
}

.archive-preview--sm {
  width: 100%;
  aspect-ratio: 16 / 10;
  max-width: 14rem;
}

.archive-preview--lg {
  width: 100%;
  min-height: clamp(12rem, 28vh, 18rem);
  aspect-ratio: 4 / 3;
}

.archive-preview__shot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  opacity: 0;
  transition: opacity 0.45s var(--arch-ease, cubic-bezier(0.22, 1, 0.36, 1));
}

.archive-preview.has-image .archive-preview__shot {
  opacity: 1;
}

.archive-preview__fallback {
  position: absolute;
  inset: 0;
}

.archive-preview__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.35;
}

.archive-preview__scan {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 60% at 70% 30%,
    hsla(var(--preview-hue), 55%, 58%, 0.14) 0%,
    transparent 68%
  );
}

.archive-preview__glyph {
  position: absolute;
  right: 1rem;
  bottom: 0.75rem;
  font-family: var(--font-mono);
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 300;
  letter-spacing: -0.04em;
  color: hsla(var(--preview-hue), 40%, 72%, 0.22);
  line-height: 1;
  user-select: none;
}
</style>
