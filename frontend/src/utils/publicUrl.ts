/**
 * 资源路径工具 — 统一处理部署基线路径。
 *
 * Vite 把 `base` 注入为 `import.meta.env.BASE_URL`：
 * - Vercel 根路径部署为 `'/'`
 * - GitHub Pages 项目页为 `'/jol/'`
 *
 * 源码中引用 `public/` 下的静态资源时，**不要**硬编码以 `/` 开头的绝对路径，
 * 否则子路径部署下会 404（实测：/works/previews/*.webp、/fonts/* 等）。
 * 一律通过 `publicUrl()` 拼接。
 */

/** 归一化后的站点基线路径，始终以 `/` 开头并以 `/` 结尾（如 `'/'`、`'/jol/'`） */
export const BASE_PATH: string = (() => {
  const raw = import.meta.env.BASE_URL ?? '/'
  const trimmed = raw.replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
})()

/**
 * 把 `public/` 下的资源相对路径转为带基线的可用 URL。
 *
 * @param path 以 `/` 开头的 public 相对路径，如 `'/avatar.svg'`
 * @returns 完整资源路径，如 `'/jol/avatar.svg'`
 *
 * @example
 * publicUrl('/works/previews/jol.webp') // => '/jol/works/previews/jol.webp'
 */
export function publicUrl(path: string): string {
  return BASE_PATH + path.replace(/^\/+/, '')
}
