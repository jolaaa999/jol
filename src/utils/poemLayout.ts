import type { PoemArticle, PoemLayout, PoemCharSlot } from '@/types/poem'

const PUNCT = new Set('，。、；：？！…—·')

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
  const extras = '风月花草云山水月夜光梦诗文字代码拓扑窗口编译'
  for (const c of extras) set.add(c)
  return [...set]
}

export function pickRandomPoem(
  articles: PoemArticle[],
): PoemArticle {
  const idx = Math.floor(Math.random() * articles.length)
  return articles[idx]
}
