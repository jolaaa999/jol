import gsap from 'gsap'

/** 错落式遮罩文本展开 — 默认动效参数 */
export const STAGGERED_MASKED_TEXT_DEFAULTS = {
  /** 内层初始位移：藏在遮罩顶缘之外 */
  hiddenYPercent: -110,
  /** 单条滑入时长 */
  duration: 0.78,
  /** 瀑布流间隔：0.08–0.1s 区间 */
  stagger: 0.09,
  /** 起步干脆、收尾柔和的阻尼缓动 */
  ease: 'power4.out',
} as const

export interface StaggeredMaskedTextRevealOptions {
  duration?: number
  stagger?: number | gsap.StaggerVars
  ease?: string
  hiddenYPercent?: number
  position?: gsap.Position
}

/**
 * 将目标文本重置为遮罩顶外隐藏态（translateY -110%）
 * @param targets - 内层文本节点集合
 * @param hiddenYPercent - 隐藏位移百分比，默认 -110
 */
export function setMaskedTextHidden(
  targets: gsap.TweenTarget,
  hiddenYPercent: number = STAGGERED_MASKED_TEXT_DEFAULTS.hiddenYPercent,
): void {
  gsap.set(targets, { yPercent: hiddenYPercent, force3D: true })
}

/**
 * 错落式遮罩文本展开入场
 * 外层 overflow:hidden 裁切，内层 yPercent 从 -110 → 0，stagger 形成瀑布流
 * @param timeline - 挂载到的 GSAP 时间轴
 * @param targets - 内层文本节点
 * @param options - 时长 / stagger / 缓动 / 插入位置
 */
export function playStaggeredMaskedTextReveal(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  options: StaggeredMaskedTextRevealOptions = {},
): gsap.core.Timeline {
  const {
    duration = STAGGERED_MASKED_TEXT_DEFAULTS.duration,
    stagger = STAGGERED_MASKED_TEXT_DEFAULTS.stagger,
    ease = STAGGERED_MASKED_TEXT_DEFAULTS.ease,
    position = '>',
  } = options

  return timeline.to(
    targets,
    {
      yPercent: 0,
      duration,
      stagger,
      ease,
      force3D: true,
    },
    position,
  )
}

/**
 * 错落式遮罩文本收回（关闭时逆序滑回遮罩顶外）
 * @param timeline - GSAP 时间轴
 * @param targets - 内层文本节点
 * @param options - 可覆盖时长、stagger、缓动
 */
export function playStaggeredMaskedTextHide(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  options: StaggeredMaskedTextRevealOptions = {},
): gsap.core.Timeline {
  const {
    duration = 0.34,
    stagger = { each: 0.04, from: 'end' as const },
    ease = 'power3.in',
    hiddenYPercent = STAGGERED_MASKED_TEXT_DEFAULTS.hiddenYPercent,
    position = '>',
  } = options

  return timeline.to(
    targets,
    {
      yPercent: hiddenYPercent,
      duration,
      stagger,
      ease,
      force3D: true,
    },
    position,
  )
}
