import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

export interface NavSegment {
  id: string
  label: string
  href: string
}

/** GSAP 机械阻尼导航栏动画 */
export function useGsapNav(
  containerRef: Ref<HTMLElement | null>,
  segments: NavSegment[],
) {
  const activeIndex = ref(0)
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
