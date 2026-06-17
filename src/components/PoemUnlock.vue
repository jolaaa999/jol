<script setup lang="ts">
import { ref, shallowRef, onUnmounted } from 'vue'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { usePoemScene } from '@/composables/usePoemScene'
import { loadChineseFont } from '@/utils/chineseFontLoader'
import { buildPoemLayout, pickRandomPoem } from '@/utils/poemLayout'
import type { PoemArticle, PoemLayout } from '@/types/poem'

const emit = defineEmits<{
  complete: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const layoutRef = shallowRef<PoemLayout | null>(null)
const fontRef = shallowRef<Font | null>(null)
const loadError = ref(false)
const loading = ref(true)
const poemTitle = ref('')

const { phase, filledCount, totalBlanks, init, dispose, rebuildScene } =
  usePoemScene(canvasRef, layoutRef, fontRef, {
    dissolveDuration: 2000,
    onComplete: () => emit('complete'),
  })

async function bootstrap(): Promise<void> {
  loading.value = true
  loadError.value = false

  try {
    let articles: PoemArticle[] = []

    try {
      const res = await fetch('/api/poetry')
      if (res.ok) {
        const json = (await res.json()) as {
          data: Array<{ id: string; title: string; content: string }>
        }
        articles = json.data.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
        }))
      }
    } catch {
      /* 回退本地 mock */
    }

    if (!articles.length) {
      articles = [
        {
          id: 'p-001',
          title: '静夜',
          content: '月色落在窗棂上，\n像一段未完成的代码，\n等待被编译成梦。',
        },
        {
          id: 'p-002',
          title: '风过草原',
          content: '蒲公英解体的那一秒，\n整片草原都在悄悄重写自己的坐标系。',
        },
      ]
    }

    const picked = pickRandomPoem(articles)
    poemTitle.value = picked.title
    const layout = buildPoemLayout(picked, 1 + Math.floor(Math.random() * 2))

    const allChars =
      layout.slots.map((s) => s.char).join('') +
      collectCharsForFont(layout)

    const font = await loadChineseFont(allChars)
    fontRef.value = font
    layoutRef.value = layout
    loading.value = false

    init()
    rebuildScene()
  } catch {
    loadError.value = true
    loading.value = false
  }
}

function collectCharsForFont(layout: PoemLayout): string {
  const distractors = '风月花草云山水月夜光梦诗文字代码拓扑窗口编译'
  return distractors + '□' + layout.slots.map((s) => s.char).join('')
}

bootstrap()

onUnmounted(dispose)
</script>

<template>
  <div class="poem-unlock">
    <canvas ref="canvasRef" class="scene-canvas" aria-label="诗文解锁场景" />

    <div v-if="loading" class="overlay-state">
      <span class="industrial-label">loading scene</span>
    </div>

    <div v-else-if="loadError" class="overlay-state">
      <span class="industrial-label">scene init failed</span>
    </div>

    <div v-else-if="phase === 'playing'" class="hud">
      <p class="hud-title">{{ poemTitle }}</p>
      <p class="hud-hint industrial-label">
        点击地面文字 · 填入空缺 {{ filledCount }}/{{ totalBlanks }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.poem-unlock {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #050508;
}

.scene-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.overlay-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 8, 0.92);
  pointer-events: none;
}

.hud {
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
}

.hud-title {
  margin: 0 0 0.5rem;
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--color-accent-cyan);
}

.hud-hint {
  margin: 0;
  color: var(--color-muted);
  letter-spacing: 0.16em;
}
</style>
