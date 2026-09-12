import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

/** 导航栏分段配置 */
export interface NavSegment {
  /** 分段唯一标识 */
  id: string
  /** 显示文案 */
  label: string
  /** 跳转链接 */
  href: string
}

/** GSAP 机械阻尼导航栏动画 */
export function useGsapNav(
  containerRef: Ref<HTMLElement | null>,
  segments: NavSegment[],
) {
  /** 当前激活的分段索引 */
  const activeIndex = ref(0)
  /** GSAP 上下文，卸载时 revert */
  let ctx: gsap.Context | null = null

  onMounted(() => {
    if (!containerRef.value) return

    ctx = gsap.context(() => {
      const els = containerRef.value!.querySelectorAll('[data-nav-segment]')
      const indicator = containerRef.value!.querySelector('[data-nav-indicator]')
      const brand = containerRef.value!.querySelector('[data-nav-brand]')

      gsap.set(els, { opacity: 0, y: -12 })
      gsap.set(brand, { opacity: 0, x: -20 })
      if (indicator) gsap.set(indicator, { scaleX: 0, opacity: 0 })

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.to(brand, {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: 'power4.out',
      })
        .to(
          els,
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            stagger: { each: 0.08, ease: 'power2.out' },
            ease: 'back.out(1.4)',
          },
          '-=0.35',
        )
        .to(
          indicator,
          {
            scaleX: 1,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.inOut',
          },
          '-=0.2',
        )
    }, containerRef.value)
  })

  /** 将指示器滑动到指定分段 */
  function animateIndicator(indicatorEl: HTMLElement, index: number): void {
    activeIndex.value = index
    const segment = containerRef.value?.querySelectorAll('[data-nav-segment]')[index] as HTMLElement
    if (!segment) return

    gsap.to(indicatorEl, {
      x: segment.offsetLeft,
      width: segment.offsetWidth,
      duration: 0.45,
      ease: 'power3.inOut',
    })
  }

  /** 分段悬停微动效 */
  function hoverSegment(el: HTMLElement, entering: boolean): void {
    gsap.to(el, {
      y: entering ? -2 : 0,
      duration: 0.35,
      ease: entering ? 'power2.out' : 'power3.inOut',
    })
  }

  onUnmounted(() => {
    ctx?.revert()
  })

  return { activeIndex, animateIndicator, hoverSegment, segments }
}
