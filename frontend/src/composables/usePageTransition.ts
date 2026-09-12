import { ref } from 'vue'

const FROM_ENTRY_KEY = 'jol-from-entry'

/** 全局页面过渡状态 */
const isTransitioning = ref(false)

/** 入口页 ↔ 博客页 路由桥接：标记来源并消费，驱动入场/退场动画 */
export function usePageTransition() {
  function markFromEntry(): void {
    sessionStorage.setItem(FROM_ENTRY_KEY, '1')
  }

  function isFromEntry(): boolean {
    return sessionStorage.getItem(FROM_ENTRY_KEY) === '1'
  }

  function consumeFromEntry(): boolean {
    const fromEntry = isFromEntry()
    if (fromEntry) sessionStorage.removeItem(FROM_ENTRY_KEY)
    return fromEntry
  }

  function beginTransition(): void {
    isTransitioning.value = true
  }

  function endTransition(): void {
    isTransitioning.value = false
  }

  return {
    isTransitioning,
    markFromEntry,
    isFromEntry,
    consumeFromEntry,
    beginTransition,
    endTransition,
  }
}
