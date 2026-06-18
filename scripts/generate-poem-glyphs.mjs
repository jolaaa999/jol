/**
 * 从 @fontsource/noto-sans-sc 提取解锁页所需汉字，合并进 public/fonts/poem.typeface.json
 * 运行: node scripts/generate-poem-glyphs.mjs
 */
import fs from 'fs'
import path from 'path'
import opentype from 'opentype.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const REQUIRED =
  '半手抚柔面，青丝渡香腮□风花雪月云雾山水天地光影梦境诗词书画琴酒竹梅兰菊江河湖海星辰雨露' +
  '回退本地静夜色落在窗棂上像一段未完成的代码等待被编译成梦蒲公英解体的那一秒整片草原都在悄悄重写自己的坐标系'

const filesDir = path.join(root, 'node_modules/@fontsource/noto-sans-sc/files')
const outPath = path.join(root, 'public/fonts/poem.typeface.json')

function flipY(y, ascender) {
  return ascender - y
}

function pathToTypefaceO(pathCmd, ascender) {
  const parts = []
  for (const cmd of pathCmd.commands) {
    switch (cmd.type) {
      case 'M':
        parts.push(`m ${cmd.x} ${flipY(cmd.y, ascender)}`)
        break
      case 'L':
        parts.push(`l ${cmd.x} ${flipY(cmd.y, ascender)}`)
        break
      case 'Q':
        parts.push(`q ${cmd.x1} ${flipY(cmd.y1, ascender)} ${cmd.x} ${flipY(cmd.y, ascender)}`)
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

function glyphFromOt(otFont, char) {
  const glyph = otFont.charToGlyph(char)
  if (!glyph || glyph.index === 0) return null
  const cp = char.codePointAt(0)
  if (glyph.unicode !== cp) return null

  const ascender = otFont.ascender
  const scale = 1000 / otFont.unitsPerEm
  const pathObj = glyph.getPath(0, 0, 1000)
  const bbox = pathObj.getBoundingBox()

  return {
    ha: Math.round((glyph.advanceWidth ?? otFont.unitsPerEm) * scale),
    x_min: bbox.x1,
    x_max: bbox.x2,
    o: pathToTypefaceO(pathObj, ascender * scale),
  }
}

const woffFiles = fs
  .readdirSync(filesDir)
  .filter((f) => f.includes('chinese-simplified-400-normal.woff') && !f.endsWith('woff2'))

const otFonts = woffFiles.map((f) => opentype.parse(fs.readFileSync(path.join(filesDir, f))))

const base = JSON.parse(fs.readFileSync(outPath, 'utf8'))
const unique = [...new Set(REQUIRED.split(''))].filter(Boolean)
let added = 0

for (const char of unique) {
  if (base.glyphs[char]) continue
  for (const otFont of otFonts) {
    const g = glyphFromOt(otFont, char)
    if (g) {
      base.glyphs[char] = g
      added++
      break
    }
  }
  if (!base.glyphs[char]) {
    console.warn('missing glyph:', char)
  }
}

fs.writeFileSync(outPath, JSON.stringify(base))
console.log(`merged ${added} glyphs, total ${Object.keys(base.glyphs).length}`)
