import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { loadChineseFont } from '@/utils/chineseFontLoader'
import {
  UNLOCK_POEM,
  UNLOCK_BLANK_CHARS,
  buildPoemLayoutWithBlanks,
  collectAllFontChars,
} from '@/utils/poemLayout'
import type { PoemLayout } from '@/types/poem'

export interface UnlockPreloadResult {
  font: Font
  layout: PoemLayout
}

let preloadPromise: Promise<UnlockPreloadResult> | null = null

/** 预加载解锁页字体与布局（幂等，Landing 挂载时即可调用） */
export function preloadUnlockAssets(): Promise<UnlockPreloadResult> {
  if (!preloadPromise) {
    preloadPromise = (async () => {
      const layout = buildPoemLayoutWithBlanks(UNLOCK_POEM, UNLOCK_BLANK_CHARS)
      const font = await loadChineseFont(collectAllFontChars(layout))
      return { font, layout }
    })()
  }
  return preloadPromise
}
