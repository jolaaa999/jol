<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCommandPalette } from '@/composables/useCommandPalette'
import { useBlogEntries } from '@/composables/useBlogEntries'

const { open, hide, toggle } = useCommandPalette()
const { entries, fetchEntries, search } = useBlogEntries()
const router = useRouter()

const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const navItems = [
  { label: 'Blog', to: '/blog' },
  { label: 'About', to: '/entry#about' },
  { label: 'Works', to: '/entry#works' },
  { label: 'Contact', to: '/entry#contact' },
]

const results = computed(() => {
  const q = query.value.trim()
  const posts = q ? search(q) : entries.value.slice(0, 6)
  const nav = q
    ? navItems.filter((n) => n.label.toLowerCase().includes(q.toLowerCase()))
    : navItems
  return [
    ...nav.map((n) => ({ type: 'nav' as const, ...n })),
    ...posts.map((p) => ({
      type: 'post' as const,
      label: p.title,
      to: `/blog/post/${p.id}`,
      excerpt: p.excerpt,
    })),
  ]
})

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    hide()
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selected.value = Math.min(selected.value + 1, results.value.length - 1)
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selected.value = Math.max(selected.value - 1, 0)
  }
  if (e.key === 'Enter' && results.value[selected.value]) {
    e.preventDefault()
    go(results.value[selected.value].to)
  }
}

function go(to: string): void {
  hide()
  query.value = ''
  const hashIdx = to.indexOf('#')
  if (hashIdx === -1) {
    router.push(to)
    return
  }
  router.push({ path: to.slice(0, hashIdx), hash: to.slice(hashIdx) })
}

watch(open, async (v) => {
  if (v) {
    await fetchEntries()
    await nextTick()
    inputRef.value?.focus()
    selected.value = 0
  }
})

watch(query, () => {
  selected.value = 0
})

function onGlobalKey(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    toggle()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKey)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="cmdk"
      role="dialog"
      aria-modal="true"
      aria-label="命令面板"
      @click.self="hide"
      @keydown="onKeydown"
    >
      <div class="cmdk__panel glass-fluid">
        <div class="cmdk__header">
          <input
            ref="inputRef"
            v-model="query"
            type="search"
            class="cmdk__input"
            placeholder="搜索文章或导航…"
            autocomplete="off"
          />
          <kbd class="cmdk__hint">esc</kbd>
        </div>
        <ul v-if="results.length" class="cmdk__list">
          <li
            v-for="(item, i) in results"
            :key="`${item.type}-${item.to}`"
            class="cmdk__item"
            :class="{ 'cmdk__item--active': i === selected }"
            @click="go(item.to)"
            @mouseenter="selected = i"
          >
            <span class="cmdk__type">{{ item.type }}</span>
            <span class="cmdk__label">{{ item.label }}</span>
            <span v-if="'excerpt' in item && item.excerpt" class="cmdk__excerpt">{{ item.excerpt }}</span>
          </li>
        </ul>
        <p v-else class="cmdk__empty">无匹配结果</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cmdk {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: grid;
  place-items: start center;
  padding: 12vh 1rem 1rem;
  background: rgba(4, 6, 14, 0.65);
  backdrop-filter: blur(12px);
}

.cmdk__panel {
  width: min(100%, 32rem);
  overflow: hidden;
}

.cmdk__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cmdk__input {
  flex: 1;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.92);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  outline: none;
}

.cmdk__hint {
  padding: 0.15rem 0.4rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.35);
}

.cmdk__list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
  max-height: 20rem;
  overflow-y: auto;
}

.cmdk__item {
  display: grid;
  gap: 0.15rem;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  border-radius: 2px;
  transition: background 0.2s;
}

.cmdk__item--active {
  background: rgba(158, 216, 255, 0.1);
}

.cmdk__type {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
}

.cmdk__label {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.9);
}

.cmdk__excerpt {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cmdk__empty {
  padding: 1.5rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
}
</style>
