/**
 * 从 @fontsource/noto-sans-sc 提取解锁页所需汉字，合并进 public/fonts/poem.typeface.json
 * 字符集自动同步 src/utils/poemLayout.ts 中的 DISTRACTOR_EXTRAS
 * 运行: npm run generate:poem-font
 */
import fs from 'fs'
import path from 'path'
import opentype from 'opentype.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

/** 从 poemLayout.ts 提取 DISTRACTOR_EXTRAS 与解锁诗文用字 */
function collectRequiredChars() {
  const poemLayoutPath = path.join(root, 'src/utils/poemLayout.ts')
  const source = fs.readFileSync(poemLayoutPath, 'utf8')

  const extrasStart = source.indexOf('const DISTRACTOR_EXTRAS')
  const extrasEnd = source.indexOf('/** 获取本篇诗文', extrasStart)
  const extrasBlock = source.slice(extrasStart, extrasEnd)
  const extras = [...extrasBlock.matchAll(/'([^']*)'/g)].map((m) => m[1]).join('')

  const poemMatch = source.match(/content:\s*'([^']+)'/)
  const poem = (poemMatch?.[1] ?? '青丝渡香腮\n半手抚柔面').replace(/\\n/g, '')

  return [...new Set((poem + extras + '□').split(''))].filter(Boolean).join('')
}

const REQUIRED = collectRequiredChars()
const filesDir = path.join(root, 'node_modules/@fontsource/noto-sans-sc/files')
const outPath = path.join(root, 'public/fonts/poem.typeface.json')
const publicWoffDir = path.join(root, 'public/fonts')

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

if (woffFiles.length === 0) {
  console.error('No Noto Sans SC woff files found. Run npm install first.')
  process.exit(1)
}

/** 复制 WOFF 到 public/fonts，供运行时子集补全回退 */
const primaryWoff = woffFiles[0]
const publicWoffPath = path.join(publicWoffDir, primaryWoff)
fs.mkdirSync(publicWoffDir, { recursive: true })
fs.copyFileSync(path.join(filesDir, primaryWoff), publicWoffPath)
console.log('copied woff fallback:', primaryWoff)

const otFonts = woffFiles.map((f) => opentype.parse(fs.readFileSync(path.join(filesDir, f))))

const base = JSON.parse(fs.readFileSync(outPath, 'utf8'))
const unique = [...new Set(REQUIRED.split(''))].filter(Boolean)
let added = 0
const stillMissing = []

for (const char of unique) {
  if (base.glyphs[char]) continue
  let found = false
  for (const otFont of otFonts) {
    const g = glyphFromOt(otFont, char)
    if (g) {
      base.glyphs[char] = g
      added++
      found = true
      break
    }
  }
  if (!found) stillMissing.push(char)
}

fs.writeFileSync(outPath, JSON.stringify(base))
console.log(`required ${unique.length} unique chars, merged ${added} glyphs, total ${Object.keys(base.glyphs).length}`)
if (stillMissing.length) {
  console.warn('still missing:', stillMissing.join(''))
  process.exit(1)
}
