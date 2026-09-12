import fs from 'node:fs'
import path from 'node:path'
import opentype from 'opentype.js'

const root = process.cwd()
const sourceFiles = [
  'src/components/PoemUnlock.vue',
  'src/utils/poemLayout.ts',
  'api/_lib/article.go',
]

const fontCandidates = [
  process.env.POEM_FONT_SOURCE,
  'C:/Windows/Fonts/NotoSansSC-VF.ttf',
  'C:/Windows/Fonts/msyh.ttc',
  'C:/Windows/Fonts/simhei.ttf',
].filter(Boolean)
const outPath = path.join(root, 'public/fonts/poem.typeface.json')
const fontPath = fontCandidates.find((candidate) => fs.existsSync(candidate))

if (!fontPath) {
  throw new Error('No source font found. Set POEM_FONT_SOURCE to a Chinese TTF/OTF/TTC file.')
}

function flipY(y, ascender) {
  return ascender - y
}

function pathToTypefaceO(glyphPath, ascender) {
  const parts = []
  for (const cmd of glyphPath.commands) {
    if (cmd.type === 'M') parts.push(`m ${cmd.x} ${flipY(cmd.y, ascender)}`)
    if (cmd.type === 'L') parts.push(`l ${cmd.x} ${flipY(cmd.y, ascender)}`)
    if (cmd.type === 'Q') parts.push(`q ${cmd.x1} ${flipY(cmd.y1, ascender)} ${cmd.x} ${flipY(cmd.y, ascender)}`)
    if (cmd.type === 'C') {
      parts.push(`b ${cmd.x1} ${flipY(cmd.y1, ascender)} ${cmd.x2} ${flipY(cmd.y2, ascender)} ${cmd.x} ${flipY(cmd.y, ascender)}`)
    }
    if (cmd.type === 'Z') parts.push('z')
  }
  return parts.join(' ')
}

let chars = '□?。，、；：？！…—· \n'

for (const file of sourceFiles) {
  chars += fs.readFileSync(path.join(root, file), 'utf8')
}

const uniqueChars = [...new Set([...chars])]
  .filter((char) => char.trim())
  .filter((char) => char.charCodeAt(0) > 127 || char === '?' || char === '□')

const font = opentype.parse(fs.readFileSync(fontPath).buffer)
const scale = 1000 / font.unitsPerEm
const ascender = font.ascender * scale
const descender = font.descender * scale
const glyphs = {}

for (const char of uniqueChars) {
  const glyph = font.charToGlyph(char)
  const glyphPath = glyph.getPath(0, 0, 1000)
  const bbox = glyphPath.getBoundingBox()
  glyphs[char] = {
    ha: Math.round((glyph.advanceWidth ?? font.unitsPerEm) * scale),
    x_min: bbox.x1,
    x_max: bbox.x2,
    o: pathToTypefaceO(glyphPath, ascender),
  }
}

const typeface = {
  glyphs,
  familyName: 'NotoSansSCSubset',
  ascender: Math.round(ascender),
  descender: Math.round(descender),
  underlinePosition: -100,
  underlineThickness: 50,
  boundingBox: {
    xMin: -100,
    yMin: Math.round(descender),
    xMax: 1000,
    yMax: Math.round(ascender),
  },
  resolution: 1000,
  original_font_information: { postscriptName: 'NotoSansSC-VF-Subset' },
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(typeface))
console.log(`Wrote ${outPath} with ${uniqueChars.length} glyphs.`)
