/**
 * 作品预览图清单。
 *
 * 背景
 * ────
 * 预览图路径由作品 id 推导（`/works/previews/<id>.webp`），而 id 来自 GitHub
 * 仓库名小写化，是可变的：仓库改名、新增仓库、切换离线占位数据，都会产生
 * 没有对应截图文件的 id。此前照常给 <img> 设 src，浏览器会对每个缺失项发一次
 * 注定 404 的请求 —— 既有控制台噪音，也会让用户先看到一段空白。
 *
 * 方案：构建期清单，而非运行时探测
 * ────────────────────────────────
 * 用 `import.meta.glob` 在构建时枚举 public/works/previews/ 下的实际文件，
 * 得到一份『存在哪些预览图』的静态清单。相比运行时 HEAD 探测：
 *
 * - 零网络请求：清单是构建期常量，运行时不需要任何探测往返；
 * - 无异步间隙：同步可用，图片存在时不会先闪一下占位块；
 * - 无失败态：不需要处理探测失败，逻辑最简。
 *
 * 「补图后要重新构建」不构成缺点 —— 图片放在 public/ 下，本就要重新构建
 * 部署才能上线，因此清单与产物的新鲜度天然一致。
 */

/**
 * 已存在的预览图文件名集合（如 `'jol'`、`'tfmy'`）。
 *
 * 由构建期 glob 的键推导：键形如 `/public/works/previews/jol.webp`。
 * 注意这里只取 glob 的**键**做存在性判断，不调用其加载函数，
 * 因此不会把图片纳入 JS 依赖图、也不产生额外请求。
 */
const PREVIEW_IDS: ReadonlySet<string> = new Set(
  Object.keys(import.meta.glob('/public/works/previews/*.webp')).map((key) =>
    key.slice(key.lastIndexOf('/') + 1).replace(/\.webp$/i, ''),
  ),
)

/**
 * 判断某作品是否已有预览图。
 *
 * @param id 作品 id（对应 `public/works/previews/<id>.webp`）
 */
export function hasWorkPreview(id: string): boolean {
  return PREVIEW_IDS.has(id)
}

/** 供调试/测试查看的清单快照 */
export function workPreviewIds(): string[] {
  return [...PREVIEW_IDS].sort()
}
