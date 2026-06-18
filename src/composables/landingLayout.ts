/** Landing 蒲公英场景布局 */
export interface LandingLayout {
  cx: number
  headY: number
  groundY: number
}

export function getLandingLayout(width: number, height: number): LandingLayout {
  const groundY = height - Math.max(12, height * 0.018)
  const headY = height * 0.42
  return { cx: width * 0.5, headY, groundY }
}
