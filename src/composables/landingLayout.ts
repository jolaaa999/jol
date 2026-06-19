/** Landing 蒲公英场景布局 */
export interface LandingLayout {
  /** 水平中心 X 坐标 */
  cx: number
  /** 花头 Y 坐标 */
  headY: number
  /** 地面 Y 坐标 */
  groundY: number
}

/** 根据画布尺寸计算蒲公英中心、花头与地面的像素坐标 */
export function getLandingLayout(width: number, height: number): LandingLayout {
  /** 地面 Y 坐标（距底边留白） */
  const groundY = height - Math.max(12, height * 0.018)
  /** 花头 Y 坐标（画面高度比例） */
  const headY = height * 0.42
  /** 水平中心 X 坐标 */
  const cx = width * 0.5
  return { cx, headY, groundY }
}
