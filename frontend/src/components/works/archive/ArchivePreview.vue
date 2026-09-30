<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkProject } from '@/types/work'
import { publicUrl } from '@/utils/publicUrl'
import { hasWorkPreview } from '@/utils/workPreview'

const props = defineProps<{
  work: WorkProject
  size?: 'sm' | 'lg'
}>()

const imageLoaded = ref(false)
const imageFailed = ref(false)

/**
 * 该作品是否已有预览图。
 *
 * 依据是构建期生成的静态清单（见 utils/workPreview.ts），同步可得，
 * 因此没有「先占位、后淡入」的探测间隙。
 */
const previewExists = computed(() => hasWorkPreview(props.work.id))

/**
 * 仅在清单确认存在时才设置 src。
 *
 * 缺失截图的 id 完全不发请求，直接展示占位块；
 * 把图片补进 public/works/previews/ 后重新构建即自动显示，无需改代码。
 */
const previewSrc = computed(() =>
  previewExists.value ? publicUrl(`/works/previews/${props.work.id}.webp`) : undefined,
)

const showImage = computed(() => previewExists.value && imageLoaded.value && !imageFailed.value)

function resetImageState(): void {
  imageLoaded.value = false
  imageFailed.value = false
}

// 列表复用组件时 id 会变化，需重置加载态，否则会沿用上一个作品的 has-image
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
      v-if="previewSrc"
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
