import * as opentype from 'opentype.js'
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

/** Typeface JSON 字形数据 */
interface TypefaceGlyph {
  /** 水平前进量 */
  ha: number
  /** 包围盒左边界 */
  x_min: number
  /** 包围盒右边界 */
  x_max: number
  /** SVG 路径命令串 */
  o: string
}

/** Three.js FontLoader 兼容的 typeface 结构 */
export interface TypefaceJson {
  glyphs: Record<string, TypefaceGlyph>
  familyName: string
  ascender: number
  descender: number
  underlinePosition: number
  underlineThickness: number
  boundingBox: { xMin: number; yMin: number; xMax: number; yMax: number }
  resolution: number
  original_font_information: Record<string, string>
}

/** 预生成 typeface JSON 候选路径 */
const FONT_JSON_CANDIDATES = ['/fonts/poem.typeface.json']

/** 本地 WOFF 回退（generate:poem-font 会复制到 public/fonts） */
const WOFF_CANDIDATES = ['/fonts/noto-sans-sc-chinese-simplified-400-normal.woff']

/** 缓存的已加载字体实例 */
let cachedFont: Font | null = null
/** 缓存中已包含的字形集合 */
let cachedGlyphSet = new Set<string>()

/** 检查字体是否包含指定字符 */
export function fontHasChar(font: Font, char: string): boolean {
  const glyphs = (font as unknown as { data?: { glyphs?: Record<string, unknown> } }).data?.glyphs
  return Boolean(glyphs && char in glyphs)
}

/** 检查字体是否包含字符串中全部字符 */
function fontHasAllChars(font: Font, chars: string): boolean {
  return [...chars].every((c) => !c.trim() || fontHasChar(font, c))
}

/** 将 Y 轴翻转为 typeface 坐标系 */
function flipY(y: number, ascender: number): number {
  return ascender - y
}

/** 将 opentype 路径转为 typeface SVG 命令串 */
function pathToTypefaceO(path: opentype.Path, ascender: number): string {
  const parts: string[] = []
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        parts.push(`m ${cmd.x} ${flipY(cmd.y, ascender)}`)
        break
      case 'L':
        parts.push(`l ${cmd.x} ${flipY(cmd.y, ascender)}`)
        break
      case 'Q':
        parts.push(
          `q ${cmd.x1} ${flipY(cmd.y1, ascender)} ${cmd.x} ${flipY(cmd.y, ascender)}`,
        )
        break
      case 'C':
        parts.push(
          `b ${cmd.x1} ${flipY(cmd.y1, ascender)} ${cmd.x2} ${flipY(cmd.y2, ascender)} ${cmd.x} ${flipY(cmd.y, ascender)}`,
        )
        break
      case 'Z':
        parts.push('z')
        break
    }
  }
  return parts.join(' ')
}

/** 从 opentype 字体提取单字字形 */
function glyphFromOpentype(otFont: opentype.Font, char: string): TypefaceGlyph | null {
  const glyph = otFont.charToGlyph(char)
  if (!glyph || glyph.index === 0) return null
  const cp = char.codePointAt(0)
  if (glyph.unicode !== cp) return null

  const ascender = otFont.ascender
  const scale = 1000 / otFont.unitsPerEm
  const path = glyph.getPath(0, 0, 1000)
  const bbox = path.getBoundingBox()

  return {
    ha: Math.round((glyph.advanceWidth ?? otFont.unitsPerEm) * scale),
    x_min: bbox.x1,
    x_max: bbox.x2,
    o: pathToTypefaceO(path, ascender * scale),
  }
}

/** 从 opentype 字体构建字符子集 typeface */
function buildTypefaceFromOpentype(otFont: opentype.Font, chars: string): TypefaceJson {
  const unique = [...new Set(chars.split(''))].filter(Boolean)
  const ascender = otFont.ascender
  const descender = otFont.descender
  const scale = 1000 / otFont.unitsPerEm
  const glyphs: Record<string, TypefaceGlyph> = {}

  for (const char of unique) {
    const g = glyphFromOpentype(otFont, char)
    if (g) glyphs[char] = g
  }

  return {
    glyphs,
    familyName: 'NotoSansSC',
    ascender: Math.round(ascender * scale),
    descender: Math.round(descender * scale),
    underlinePosition: -100,
    underlineThickness: 50,
    boundingBox: {
      xMin: -100,
      yMin: Math.round(descender * scale),
      xMax: 1000,
      yMax: Math.round(ascender * scale),
    },
    resolution: 1000,
    original_font_information: { postscriptName: 'NotoSansSC-Regular' },
  }
}

/** 从 URL 加载 typeface JSON */
async function loadTypefaceJson(url: string): Promise<TypefaceJson | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as TypefaceJson
  } catch {
    return null
  }
}

/** 依次尝试 URL 列表加载 opentype 字体 */
async function loadOpentypeFromUrls(urls: readonly string[]): Promise<opentype.Font | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const buffer = await res.arrayBuffer()
      return opentype.parse(buffer)
    } catch {
      /* try next */
    }
  }
  return null
}

/** 合并两个字形集（补全缺失字） */
function mergeGlyphs(base: TypefaceJson, patch: TypefaceJson): TypefaceJson {
  return {
    ...base,
    glyphs: { ...base.glyphs, ...patch.glyphs },
  }
}

/**
 * 加载支持中文的 Font — 优先本地 JSON，缺失字从本地 WOFF 子集补全
 */
export async function loadChineseFont(requiredChars: string): Promise<Font> {
  /** 去重后的所需字符集 */
  const chars = [...new Set((requiredChars + '□').split(''))].filter(Boolean).join('')

  if (cachedFont && [...chars].every((c) => cachedGlyphSet.has(c))) {
    return cachedFont
  }

  let typeface: TypefaceJson | null = null

  for (const url of FONT_JSON_CANDIDATES) {
    const json = await loadTypefaceJson(url)
    if (json) {
      typeface = json
      break
    }
  }

  const missing = typeface
    ? [...chars].filter((c) => !typeface!.glyphs[c])
    : [...chars]

  if (missing.length > 0) {
    const otFont = await loadOpentypeFromUrls(WOFF_CANDIDATES)
    if (!otFont) {
      throw new Error(
        `missing glyphs (${missing.length}): run npm run generate:poem-font — ${missing.slice(0, 8).join('')}`,
      )
    }
    const subset = buildTypefaceFromOpentype(otFont, missing.join(''))
    const stillMissing = missing.filter((c) => !subset.glyphs[c])
    if (stillMissing.length > 0) {
      throw new Error(`font subset incomplete: ${stillMissing.join('')}`)
    }
    typeface = typeface ? mergeGlyphs(typeface, subset) : subset
  }

  if (!typeface || !fontHasAllChars(new FontLoader().parse(typeface), chars)) {
    throw new Error('chinese font load failed')
  }

  const loader = new FontLoader()
  cachedFont = loader.parse(typeface)
  cachedGlyphSet = new Set(chars.split(''))
  return cachedFont
}
