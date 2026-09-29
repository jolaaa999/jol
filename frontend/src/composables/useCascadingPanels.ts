import { computed, ref, type Ref } from 'vue'
import gsap from 'gsap'

/**
 * 级联堆叠面板（Cascading Stacked Panels）的层级状态与过渡动画。
 *
 * 几何模型
 * ────────
 * 栈顶面板占据舞台左侧主位，父层收缩为窄条后依次紧排在其右侧：
 *
 *     [ 栈顶完整面板 ][ 父层窄条 ][ 祖父层窄条 ] ...
 *      x=0            x=topWidth  x=topWidth+peek
 *
 * 于是每次深入一级，新面板都在左侧“推”出来，而上一层保留为右侧的一条窄条，
 * 形成层层递进的导航路径与前后景深；点击窄条即可回到该层。
 *
 * 景深由 opacity 递减表达（越靠后的窄条越暗）。
 */

/** 栈顶面板宽度的兜底值（px）；实际宽度从 DOM 量取，避免与 CSS 脱节 */
const DEFAULT_STEP = 336
/** 父层在栈顶面板左侧保留的可见窄条宽度（px），CSS 变量 --cascade-peek */
const DEFAULT_PEEK = 46

/** 过渡时长（秒） */
const SLIDE_DURATION = 0.5
/** 缓动：机械阻尼感，与站点其余动效统一 */
const SLIDE_EASE = 'power3.inOut'
/** 推进时新面板相对目标位的额外右偏移比例（产生“从右侧推出”的位移感） */
const ENTER_OFFSET_RATIO = 0.62

/** 非栈顶层的不透明度基准，越深越暗 */
const DIM_BASE = 0.62
/** 每深一层的额外衰减 */
const DIM_STEP = 0.18

/** 读取 CSS 变量为像素数值，支持 rem 与 px */
function readPx(el: HTMLElement, varName: string, fallback: number): number {
  const raw = getComputedStyle(el).getPropertyValue(varName).trim()
  if (!raw) return fallback
  if (raw.endsWith('rem')) {
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    return parseFloat(raw) * rootSize
  }
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

/** 单层的目标视觉状态 */
export interface LayerTarget {
  /** 水平位移（px），相对舞台左基准 */
  x: number
  /** 缩放（景深） */
  scale: number
  /** 不透明度（景深） */
  opacity: number
  /** 层叠顺序 */
  zIndex: number
  /** 是否为当前可见层（决定是否可交互） */
  active: boolean
}

/**
 * 计算整栈的目标布局。
 *
 * 栈顶面板占据左侧主位（`x = 0`），其右侧依次紧排各父层的窄条：
 *
 *     层 top : x = 0
 *     层 i   : x = 层 i+1 的右缘
 *
 * 由于父层已被收缩为 `peek` 宽的窄条（见 CascadePanels.vue），
 * 每层矩形互不重叠，无须再用 z-index 或 clip-path 处理遮挡，
 * 窄条天然可点击。
 *
 * 景深由 scale 与 opacity 表达：越靠后的层越小、越暗。
 *
 * @param top 栈顶索引（0 表示只有一层）
 * @param topWidth 栈顶面板的完整宽度
 * @param peek 父层窄条宽度
 */
export function layoutStack(
  top: number,
  topWidth: number,
  peek: number,
): LayerTarget[] {
  const result: LayerTarget[] = []

  /** 上一层（更深一层）的右缘，初始为栈顶面板的右缘 */
  let edge = topWidth

  for (let i = top; i >= 0; i--) {
    const behind = top - i

    if (behind === 0) {
      // 栈顶：完整面板，固定在左侧主位
      result[i] = { x: 0, scale: 1, opacity: 1, zIndex: 100, active: true }
      continue
    }

    result[i] = {
      x: edge,
      // 父层只作为窄条呈现，不再缩放，避免窄条宽度与递推不符
      scale: 1,
      opacity: Math.max(0, DIM_BASE - (behind - 1) * DIM_STEP),
      zIndex: 100 - behind,
      active: false,
    }
    edge += peek
  }

  return result
}

interface Options {
  /** 面板舞台根元素 */
  rootRef: Ref<HTMLElement | null>
  /** 栈深度（栈顶层索引），由调用方维护 */
  topIndex: Ref<number>
  /** 是否处于「减少动效」偏好 */
  prefersReducedMotion: () => boolean
}

/**
 * 把栈中所有层摆放到目标位置。
 * @param animate 是否播放过渡；false 时立即吸附
 */
export function useCascadingPanels({ rootRef, topIndex, prefersReducedMotion }: Options) {
  /** 是否正在播放过渡 */
  const isSliding = ref(false)
  /** 播放中的时间线 */
  let timeline: gsap.core.Timeline | null = null

  /** 查询某层的 DOM 元素 */
  function layerAt(index: number): HTMLElement | null {
    return rootRef.value?.querySelector<HTMLElement>(`[data-cascade-index="${index}"]`) ?? null
  }

  /** 读取布局所需的度量值 */
  function metrics(): { step: number; peek: number } {
    if (!rootRef.value) return { step: DEFAULT_STEP, peek: DEFAULT_PEEK }
    return {
      step: readPx(rootRef.value, '--cascade-step', DEFAULT_STEP),
      peek: readPx(rootRef.value, '--cascade-peek', DEFAULT_PEEK),
    }
  }

  /**
   * 面板基准宽度，用于递推布局。
   *
   * 必须取**栈顶层**的宽度：仅栈顶层是完整面板，父层已被收缩为 peek 宽的窄条
   * （见 CascadePanels.vue 的 .cascade__layer--peek），若误取父层宽度
   * 会让整个递推计算崩塌。
   *
   * 注意 offsetWidth 会被 scale 影响前的布局宽度返回，因此这里是未缩放的基准宽度。
   */
  function panelWidth(): number {
    const el = layerAt(topIndex.value)
    return el?.offsetWidth || DEFAULT_STEP
  }

  /** 计算当前栈的目标布局 */
  function computeLayout(): LayerTarget[] {
    const { peek } = metrics()
    return layoutStack(topIndex.value, panelWidth(), peek)
  }

  /** 立即把所有层吸附到目标位（无动画） */
  function applyLayout(): void {
    const targets = computeLayout()
    for (let i = 0; i < targets.length; i++) {
      const el = layerAt(i)
      if (!el) continue
      const t = targets[i]
      gsap.set(el, {
        x: t.x,
        scale: t.scale,
        opacity: t.opacity,
        zIndex: t.zIndex,
        transformOrigin: 'left center',
        force3D: true,
      })
    }
  }

  /**
   * 播放层级过渡到当前 topIndex。
   *
   * @param direction `forward` 表示新推入了一层，`back` 表示回退
   */
  function play(direction: 'forward' | 'back', onDone?: () => void): void {
    if (!rootRef.value) {
      onDone?.()
      return
    }

    if (prefersReducedMotion()) {
      applyLayout()
      onDone?.()
      return
    }

    timeline?.kill()
    isSliding.value = true

    const targets = computeLayout()
    const width = panelWidth()
    const tl = gsap.timeline({
      defaults: { duration: SLIDE_DURATION, ease: SLIDE_EASE, force3D: true },
      onComplete: () => {
        isSliding.value = false
        // 收尾吸附，消除浮点误差
        applyLayout()
        onDone?.()
      },
    })
    timeline = tl

    for (let i = 0; i < targets.length; i++) {
      const el = layerAt(i)
      if (!el) continue
      const t = targets[i]

      if (direction === 'forward' && i === topIndex.value) {
        // 新推入的层：从右侧更远处滑入，制造“推出”而非“淡入”的位移感
        gsap.set(el, { x: t.x + width * ENTER_OFFSET_RATIO, scale: 1, opacity: 0, zIndex: t.zIndex })
        tl.to(el, { x: t.x, scale: t.scale, opacity: t.opacity }, 0.04)
      } else {
        tl.to(el, { x: t.x, scale: t.scale, opacity: t.opacity, zIndex: t.zIndex }, 0)
      }
    }

    if (!targets.length) {
      isSliding.value = false
      onDone?.()
    }
  }

  /** 释放时间线 */
  function dispose(): void {
    timeline?.kill()
    timeline = null
  }

  return { isSliding, applyLayout, play, dispose, depth: computed(() => topIndex.value) }
}
