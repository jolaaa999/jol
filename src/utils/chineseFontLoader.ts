import * as opentype from 'opentype.js'
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'

interface TypefaceGlyph {
  ha: number
  x_min: number
  x_max: number
  o: string
}

interface TypefaceJson {
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

const FONT_CANDIDATES = [
  '/fonts/poem.typeface.json',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/fonts/helvetiker_regular.typeface.json',
]

const OTF_URL =
  'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf'

let cachedFont: Font | null = null
let cachedChars = ''

function flipY(y: number, ascender: number): number {
  return ascender - y
}

/** 将 opentype 路径转为 Three.js typeface.json 的 `o` 字段 */
function pathToTypefaceO(
  path: opentype.Path,
  ascender: number,
): string {
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

function buildTypefaceFromOpentype(
  otFont: opentype.Font,
  chars: string,
): TypefaceJson {
  const unique = [...new Set(chars.split(''))].filter(Boolean)
  const ascender = otFont.ascender
  const descender = otFont.descender
  const scale = 1000 / otFont.unitsPerEm

  const glyphs: Record<string, TypefaceGlyph> = {}

  for (const char of unique) {
    const glyph = otFont.charToGlyph(char)
    const path = glyph.getPath(0, 0, 1000)
    const bbox = path.getBoundingBox()
    glyphs[char] = {
      ha: Math.round((glyph.advanceWidth ?? otFont.unitsPerEm) * scale),
      x_min: bbox.x1,
      x_max: bbox.x2,
      o: pathToTypefaceO(path, ascender * scale),
    }
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

async function loadOpentypeFont(): Promise<opentype.Font> {
  const buffer = await fetch(OTF_URL).then((r) => {
    if (!r.ok) throw new Error('font fetch failed')
    return r.arrayBuffer()
  })
  return opentype.parse(buffer)
}

async function loadJsonFont(url: string): Promise<Font | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as TypefaceJson
    const loader = new FontLoader()
    return loader.parse(json)
  } catch {
    return null
  }
}

/**
 * 加载支持中文的 Font — 优先本地 JSON，回退 opentype 动态子集
 */
export async function loadChineseFont(requiredChars: string): Promise<Font> {
  const chars = [...new Set(requiredChars.split(''))].join('')
  if (cachedFont && cachedChars.includes(chars)) return cachedFont

  for (const url of FONT_CANDIDATES) {
    const font = await loadJsonFont(url)
    if (font) {
      cachedFont = font
      cachedChars = chars
      return font
    }
  }

  const otFont = await loadOpentypeFont()
  const typeface = buildTypefaceFromOpentype(otFont, chars + '□')
  const loader = new FontLoader()
  cachedFont = loader.parse(typeface)
  cachedChars = chars
  return cachedFont
}
