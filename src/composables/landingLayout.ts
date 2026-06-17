/** Landing 场景布局 — 草地与蒲公英共用地面线 */
export interface LandingLayout {
  cx: number
  headY: number
  groundY: number
}

export function getLandingLayout(width: number, height: number): LandingLayout {
  const groundY = height - Math.max(12, height * 0.018)
  const headY = height * 0.4
  return { cx: width * 0.5, headY, groundY }
}
