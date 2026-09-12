import { ref } from 'vue'

const open = ref(false)

export function useCommandPalette() {
  function show(): void {
    open.value = true
  }

  function hide(): void {
    open.value = false
  }

  function toggle(): void {
    open.value = !open.value
  }

  return { open, show, hide, toggle }
}
