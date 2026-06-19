import type { PoemArticle, PoemLayout, PoemCharSlot } from '@/types/poem'

/** 中文标点集合 — 挖空时排除 */
const PUNCT = new Set('，。、；：？！…—·')

/** 解锁页固定诗文 */
export const UNLOCK_POEM: PoemArticle = {
  id: 'unlock-fixed',
  title: '半手抚柔面',
  content: '青丝渡香腮\n半手抚柔面',
}

/** 解锁页固定挖空字符 */
export const UNLOCK_BLANK_CHARS = ['抚', '渡'] as const

/** 随机挖空指定数量的字，构建竖排诗词布局 */
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

/** 干扰字扩展意象字符集（不含本篇诗文用字） */
const DISTRACTOR_EXTRAS =
  '风花雪月云雾山水天地光影梦境诗词书画琴酒竹梅兰菊江河湖海星辰雨露' +
  '春夏秋冬晨昏鸟虫鱼林木石泉溪云霞烟雨雪霜肝胆心意情思乡愁归雁孤舟' +
  '渔火灯烛笔墨纸砚帘幕庭院楼阁亭台碑帖古卷松柏杨柳桃李杏李'

/** 获取本篇诗文所有保留字（解锁字，不可在干扰/背景中重复出现） */
export function getPoemReservedChars(layout: PoemLayout): Set<string> {
  const set = new Set<string>()
  for (const s of layout.slots) {
    if (!PUNCT.has(s.char) && s.char.trim()) set.add(s.char)
  }
  return set
}

/** 收集干扰字符池 — 诗文用字 + 常见意象字 */
export function collectDistractorChars(layout: PoemLayout): string[] {
  const set = new Set<string>()
  for (const s of layout.slots) {
    if (!PUNCT.has(s.char)) set.add(s.char)
  }
  for (const c of DISTRACTOR_EXTRAS) set.add(c)
  return [...set]
}

/** 获取可用于干扰/背景的字形集合（去重，排除本篇诗文用字） */
export function getDistractorCharSet(layout: PoemLayout): string[] {
  const reserved = getPoemReservedChars(layout)
  return [...DISTRACTOR_EXTRAS].filter((c) => !reserved.has(c))
}

/** 构建全屏干扰字池 — 排除本篇诗文用字，每字唯一 */
export function buildUniqueGroundDistractors(layout: PoemLayout): string[] {
  const pool = getDistractorCharSet(layout)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

/** 构建可点击干扰字池 — 允许意象字重复出现以增加数量 */
export function buildGroundDistractorPool(
  layout: PoemLayout,
  copiesPerChar = 2,
): string[] {
  const base = buildUniqueGroundDistractors(layout)
  const pool: string[] = []
  for (const c of base) {
    for (let i = 0; i < copiesPerChar; i++) pool.push(c)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
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

/** 背景字阵字符池 — 仅意象字，不含本篇诗文用字 */
export function buildBackgroundCharPool(layout: PoemLayout): string[] {
  return buildUniqueGroundDistractors(layout)
}

/** 汇总所有需加载字形的字符 */
export function collectAllFontChars(layout: PoemLayout): string {
  return (
    layout.slots.map((s) => s.char).join('') +
    buildUniqueGroundDistractors(layout).join('') +
    '□'
  )
}

/** 从文章列表中随机选取一首 */
export function pickRandomPoem(
  articles: PoemArticle[],
): PoemArticle {
  const idx = Math.floor(Math.random() * articles.length)
  return articles[idx]
}
