import { ref, watch } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'jol-theme'

const mode = ref<ThemeMode>('dark')
const resolved = ref<'dark' | 'light'>('dark')

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const HLJS_THEME_ID = 'hljs-theme'

function syncHljsTheme(theme: 'dark' | 'light'): void {
  let link = document.getElementById(HLJS_THEME_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = HLJS_THEME_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href =
    theme === 'light'
      ? 'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github.min.css'
      : 'https://cdn.jsdelivr.net/npm/highlight.js@11.11.1/styles/github-dark.min.css'
}

function applyTheme(theme: 'dark' | 'light'): void {
  resolved.value = theme
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
  syncHljsTheme(theme)
}

function resolveMode(m: ThemeMode): 'dark' | 'light' {
  if (m === 'system') return getSystemTheme()
  return m
}

function initTheme(): void {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    mode.value = stored
  }
  applyTheme(resolveMode(mode.value))

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode.value === 'system') applyTheme(getSystemTheme())
  })
}

watch(mode, (m) => {
  localStorage.setItem(STORAGE_KEY, m)
  applyTheme(resolveMode(m))
})

export function useTheme() {
  function setMode(m: ThemeMode): void {
    mode.value = m
  }

  function toggle(): void {
    mode.value = resolved.value === 'dark' ? 'light' : 'dark'
  }

  return { mode, resolved, setMode, toggle, initTheme }
}
