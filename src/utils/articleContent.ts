import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import go from 'highlight.js/lib/languages/go'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('go', go)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)

marked.setOptions({
  gfm: true,
  breaks: true,
})

marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      const highlighted = hljs.highlight(text, { language }).value
      return `<pre class="article-code"><code class="hljs language-${language}">${highlighted}</code></pre>`
    },
  },
})

/** 将 Markdown / 纯文本渲染为 HTML */
export function renderArticleHtml(content: string): string {
  return marked.parse(content) as string
}

/** 从 Markdown 提取 h2/h3 标题作为 TOC */
export interface TocItem {
  id: string
  text: string
  level: number
}

export function extractToc(content: string): TocItem[] {
  const items: TocItem[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/)
    const h3 = line.match(/^###\s+(.+)$/)
    if (h2) {
      const text = h2[1].trim()
      items.push({ id: slugify(text), text, level: 2 })
    } else if (h3) {
      const text = h3[1].trim()
      items.push({ id: slugify(text), text, level: 3 })
    }
  }
  return items
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** 为渲染后的 HTML 标题注入 id 锚点 */
export function injectHeadingIds(html: string, toc: TocItem[]): string {
  let result = html
  for (const item of toc) {
    const escaped = item.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`<h${item.level}>(${escaped})</h${item.level}>`, 'i')
    result = result.replace(re, `<h${item.level} id="${item.id}">$1</h${item.level}>`)
  }
  return result
}
