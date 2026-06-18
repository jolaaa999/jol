import type { PoemArticle, PoemLayout, PoemCharSlot } from '@/types/poem'

const PUNCT = new Set('，。、；：？！…—·')

/** 解锁页固定诗文 */
export const UNLOCK_POEM: PoemArticle = {
  id: 'unlock-fixed',
  title: '半手抚柔面',
  content: '青丝渡香腮\n半手抚柔面',
}

export const UNLOCK_BLANK_CHARS = ['抚', '渡'] as const

export function buildPoemLayout(
  article: PoemArticle,
  blankCount = 3,
): PoemLayout {
  const lines = article.content
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const slots: PoemCharSlot[] = []
  let globalIndex = 0

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    const col = lines.length - 1 - lineIdx
    for (let row = 0; row < line.length; row++) {
      slots.push({
        char: line[row],
        col,
        row,
        globalIndex,
        isBlank: false,
        filled: false,
      })
      globalIndex++
    }
  }

  const candidates = slots
    .filter((s) => !PUNCT.has(s.char) && s.char.trim())
    .map((s) => s.globalIndex)

  const count = Math.min(blankCount, candidates.length)
  const shuffled = [...candidates].sort(() => Math.random() - 0.5)
  const blankIndices = new Set(shuffled.slice(0, count))

  for (const slot of slots) {
    if (blankIndices.has(slot.globalIndex)) {
      slot.isBlank = true
      slot.filled = false
    } else {
      slot.filled = true
    }
  }

  return {
    title: article.title,
    lines,
    slots,
    blankIndices,
  }
}

export function collectDistractorChars(layout: PoemLayout): string[] {
  const set = new Set<string>()
  for (const s of layout.slots) {
    if (!PUNCT.has(s.char)) set.add(s.char)
  }
  const extras = '风花雪月云雾山水天地光影梦境诗词书画琴酒竹梅兰菊江河湖海星辰雨露'
  for (const c of extras) set.add(c)
  return [...set]
}

/** 按指定字挖空（仅挖非标点且首次匹配） */
export function buildPoemLayoutWithBlanks(
  article: PoemArticle,
  blankChars: readonly string[],
): PoemLayout {
  const layout = buildPoemLayout(article, 0)
  const wanted = new Set(blankChars)
  const blankIndices = new Set<number>()

  for (const slot of layout.slots) {
    if (wanted.has(slot.char) && !PUNCT.has(slot.char)) {
      slot.isBlank = true
      slot.filled = false
      blankIndices.add(slot.globalIndex)
      wanted.delete(slot.char)
    } else if (!slot.isBlank) {
      slot.filled = true
    }
  }

  layout.blankIndices = blankIndices
  return layout
}

/** 背景字阵字符池 — 重复铺陈以铺满画面 */
export function buildBackgroundCharPool(layout: PoemLayout): string[] {
  const pool: string[] = []
  for (const s of layout.slots) {
    if (!PUNCT.has(s.char)) pool.push(s.char)
  }
  const extras =
    '风花雪月云雾山水天地光影梦境诗词书画琴酒竹梅兰菊江河湖海星辰雨露半手柔面青丝香腮'
  for (let r = 0; r < 6; r++) {
    for (const c of extras) pool.push(c)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

export function collectAllFontChars(layout: PoemLayout): string {
  return (
    layout.slots.map((s) => s.char).join('') +
    collectDistractorChars(layout).join('') +
    buildBackgroundCharPool(layout).join('') +
    '□'
  )
}

export function pickRandomPoem(
  articles: PoemArticle[],
): PoemArticle {
  const idx = Math.floor(Math.random() * articles.length)
  return articles[idx]
}
