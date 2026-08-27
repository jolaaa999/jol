/** 按中英文混合文本估算阅读分钟数 */
export function estimateReadingMinutes(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 1
  const cjk = (trimmed.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latin = trimmed.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil(cjk / 400 + latin / 200)
  return Math.max(1, minutes)
}
